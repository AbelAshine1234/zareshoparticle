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

// GET /api/categories -> ["name", ...]
router.get('/', async (_req, res) => {
  try {
    const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } })
    res.json(categories.map(c => c.name))
  } catch (e) {
    res.status(500).json({ error: 'Internal error' })
  }
})

// POST /api/categories { name }
router.post('/', async (req, res) => {
  try {
    const user = await getAuthUser(req)
    if (!user) return res.status(401).json({ error: 'Unauthorized' })
    if ((user.role || 'user') !== 'admin') return res.status(403).json({ error: 'Forbidden' })

    const { name } = req.body || {}
    if (!name) return res.status(400).json({ error: 'name required' })

    const value = String(name).trim()
    const created = await prisma.category.upsert({
      where: { name: value },
      update: {},
      create: { name: value }
    })
    res.status(201).json({ name: created.name })
  } catch (e) {
    res.status(500).json({ error: 'Internal error' })
  }
})

export default router
