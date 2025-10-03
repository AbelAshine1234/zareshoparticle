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

// Helper: check if any user exists
async function usersCount() {
  return prisma.user.count()
}

// Create an admin user.
// Allowed if requester is admin OR if there are no users yet (bootstrap first admin).
router.post('/create', async (req, res) => {
  try {
    const { name, phone, password } = req.body || {}
    if (!name || !phone || !password) return res.status(400).json({ error: 'name, phone, password required' })

    const count = await usersCount()
    const user = await getAuthUser(req)
    const isAllowed = (user && (user.role || 'user') === 'admin') || count === 0
    if (!isAllowed) return res.status(403).json({ error: 'Forbidden' })

    const exists = await prisma.user.findUnique({ where: { phone: String(phone) } })
    if (exists) return res.status(409).json({ error: 'phone already registered' })

    const created = await prisma.user.create({
      data: { name: String(name), phone: String(phone), password: String(password), role: 'admin' },
      select: { id: true, name: true, phone: true, role: true }
    })

    res.status(201).json(created)
  } catch (e) {
    res.status(500).json({ error: 'Internal error' })
  }
})

// Promote an existing user to admin (admin only)
router.post('/promote', async (req, res) => {
  try {
    const user = await getAuthUser(req)
    if (!user) return res.status(401).json({ error: 'Unauthorized' })
    if ((user.role || 'user') !== 'admin') return res.status(403).json({ error: 'Forbidden' })

    const { phone } = req.body || {}
    if (!phone) return res.status(400).json({ error: 'phone required' })

    const target = await prisma.user.findUnique({ where: { phone: String(phone) } })
    if (!target) return res.status(404).json({ error: 'User not found' })

    const updated = await prisma.user.update({ where: { id: target.id }, data: { role: 'admin' }, select: { id: true, phone: true, role: true } })
    res.json(updated)
  } catch (e) {
    res.status(500).json({ error: 'Internal error' })
  }
})

export default router
