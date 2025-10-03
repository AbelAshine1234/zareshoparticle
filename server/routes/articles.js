import express from 'express'
import prisma from '../prisma/client.js'
import { v4 as uuidv4 } from 'uuid'

const router = express.Router()

function bearerToken(req) {
  const auth = req.header('authorization') || ''
  return auth.startsWith('Bearer ') ? auth.slice(7) : ''
}

async function getAuthUser(req) {
  const token = bearerToken(req)
  if (!token) return null
  const session = await prisma.session.findUnique({ where: { token } })
  if (!session) return null
  return prisma.user.findUnique({ where: { id: session.userId } })
}

function toApiArticle(a) {
  return {
    id: a.id,
    title: a.title,
    content: a.content,
    createdAt: a.createdAt,
    authorId: a.authorId,
    authorName: a.author?.name || a.author?.phone || 'Unknown',
    category: a.category?.name || '',
    imageUrl: a.imageUrl || ''
  }
}

// List all articles (newest first), optional ?category=Name
router.get('/', async (req, res) => {
  try {
    const { category } = req.query || {}

    let where = {}
    if (category) {
      // filter by category name
      const cat = await prisma.category.findUnique({ where: { name: String(category) } })
      if (!cat) return res.json([])
      where = { categoryId: cat.id }
    }

    const articles = await prisma.article.findMany({
      where,
      include: { author: true, category: true },
      orderBy: { createdAt: 'desc' }
    })

    res.json(articles.map(toApiArticle))
  } catch (e) {
    res.status(500).json({ error: 'Internal error' })
  }
})

// Get single article
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const article = await prisma.article.findUnique({ where: { id }, include: { author: true, category: true } })
    if (!article) return res.status(404).json({ error: 'Article not found' })
    res.json(toApiArticle(article))
  } catch (e) {
    res.status(500).json({ error: 'Internal error' })
  }
})

// Create article (auth required)
router.post('/', async (req, res) => {
  try {
    const user = await getAuthUser(req)
    if (!user) return res.status(401).json({ error: 'Unauthorized' })

    const { title, content, category, imageUrl } = req.body || {}
    if (!title || !content) return res.status(400).json({ error: 'Title and content are required' })

    let categoryId = null
    if (category && String(category).trim()) {
      const existing = await prisma.category.findUnique({ where: { name: String(category).trim() } })
      categoryId = existing ? existing.id : null
    }

    const created = await prisma.article.create({
      data: {
        id: uuidv4(),
        title: String(title).trim(),
        content: String(content).trim(),
        imageUrl: imageUrl || '',
        authorId: user.id,
        categoryId,
      },
      include: { author: true, category: true }
    })

    res.status(201).json(toApiArticle(created))
  } catch (e) {
    res.status(500).json({ error: 'Internal error' })
  }
})

// Delete article (admin only)
router.delete('/:id', async (req, res) => {
  try {
    const user = await getAuthUser(req)
    if (!user) return res.status(401).json({ error: 'Unauthorized' })
    if ((user.role || 'user') !== 'admin') return res.status(403).json({ error: 'Forbidden' })

    const { id } = req.params
    const found = await prisma.article.findUnique({ where: { id } })
    if (!found) return res.status(404).json({ error: 'Article not found' })

    // Delete comments first, then the article (transaction ensures atomicity)
    await prisma.$transaction([
      prisma.comment.deleteMany({ where: { articleId: id } }),
      prisma.article.delete({ where: { id } })
    ])
    res.json({ message: 'Article deleted successfully' })
  } catch (e) {
    res.status(500).json({ error: 'Internal error' })
  }
})

export default router
