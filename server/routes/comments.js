import express from 'express'
import prisma from '../prisma/client.js'

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

// GET /api/articles/:id/comments
router.get('/articles/:id/comments', async (req, res) => {
  try {
    const { id } = req.params
    const exists = await prisma.article.findUnique({ where: { id } })
    if (!exists) return res.status(404).json({ error: 'Article not found' })

    const comments = await prisma.comment.findMany({
      where: { articleId: id },
      orderBy: { createdAt: 'asc' }
    })
    res.json(comments)
  } catch (e) {
    res.status(500).json({ error: 'Internal error' })
  }
})

// POST /api/articles/:id/comments
router.post('/articles/:id/comments', async (req, res) => {
  try {
    const authUser = await getAuthUser(req)
    const { id } = req.params
    const { content, name } = req.body || {}
    if (!content) return res.status(400).json({ error: 'Comment content is required' })

    const article = await prisma.article.findUnique({ where: { id } })
    if (!article) return res.status(404).json({ error: 'Article not found' })

    const comment = await prisma.comment.create({
      data: {
        articleId: id,
        content: String(content).trim(),
        authorId: authUser ? authUser.id : null,
        authorName: authUser ? (authUser.name || authUser.phone) : (name ? String(name).trim() : 'Guest')
      }
    })

    res.status(201).json(comment)
  } catch (e) {
    res.status(500).json({ error: 'Internal error' })
  }
})

// DELETE /api/comments/:id (admin only)
router.delete('/comments/:id', async (req, res) => {
  try {
    const user = await getAuthUser(req)
    if (!user) return res.status(401).json({ error: 'Unauthorized' })
    if ((user.role || 'user') !== 'admin') return res.status(403).json({ error: 'Forbidden' })

    const { id } = req.params
    const found = await prisma.comment.findUnique({ where: { id } })
    if (!found) return res.status(404).json({ error: 'Comment not found' })

    await prisma.comment.delete({ where: { id } })
    res.json({ message: 'Comment deleted successfully' })
  } catch (e) {
    res.status(500).json({ error: 'Internal error' })
  }
})

export default router
