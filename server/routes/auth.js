import express from 'express'
import { v4 as uuidv4 } from 'uuid'
import prisma from '../prisma/client.js'
import { readFileSync, existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

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
  const user = await prisma.user.findUnique({ where: { id: session.userId } })
  return user
}

// Read admin token from server/db.json if present
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const serverDir = path.resolve(__dirname, '..')
const DB_JSON_PATH = path.join(serverDir, 'db.json')

function readAdminTokenFromFile() {
  try {
    if (!existsSync(DB_JSON_PATH)) return ''
    const db = JSON.parse(readFileSync(DB_JSON_PATH, 'utf-8'))
    return String(db.adminToken || '')
  } catch {
    return ''
  }
}

router.post('/signup', async (req, res) => {
  console.log(req.body)
  try {
    const { phone, password, name } = req.body || {}
    if (!phone || !password || !name) return res.status(400).json({ error: 'name, phone and password required' })

    const exists = await prisma.user.findUnique({ where: { phone: String(phone) } })
    if (exists) return res.status(409).json({ error: 'phone already registered' })

    const count = await prisma.user.count()
    const role = count === 0 ? 'admin' : 'user'

    const user = await prisma.user.create({
      data: { phone: String(phone), name: String(name), password: String(password), role },
      select: { id: true, phone: true, name: true }
    })

    res.status(201).json(user)
  } catch (e) {
    res.status(500).json({ error: 'Internal error' })
    console.log(e)
  }
})

router.post('/signin', async (req, res) => {
  try {
    const { phone, password } = req.body || {}
    if (!phone || !password) return res.status(400).json({ error: 'phone and password required' })

    const user = await prisma.user.findFirst({ where: { phone: String(phone), password: String(password) } })
    if (!user) return res.status(401).json({ error: 'invalid credentials' })

    const token = uuidv4()
    // Remove old sessions for this user and create new one
    await prisma.$transaction([
      prisma.session.deleteMany({ where: { userId: user.id } }),
      prisma.session.create({ data: { token, userId: user.id } })
    ])

    res.json({ token, user: { id: user.id, phone: user.phone, role: user.role || 'user' } })
  } catch (e) {
    res.status(500).json({ error: 'Internal error' })
  }
})

router.get('/me', async (req, res) => {
  try {
    const user = await getAuthUser(req)
    if (!user) return res.status(401).json({ error: 'Unauthorized' })
    res.json({ id: user.id, phone: user.phone, role: user.role || 'user' })
  } catch (e) {
    res.status(500).json({ error: 'Internal error' })
  }
})

// Sign in using admin token stored in server/db.json
router.post('/admin-token', async (req, res) => {
  try {
    const { token } = req.body || {}
    if (!token) return res.status(400).json({ error: 'token required' })

    const adminToken = readAdminTokenFromFile()
    if (!adminToken) return res.status(404).json({ error: 'admin token is not configured on server' })
    if (String(token) !== String(adminToken)) return res.status(401).json({ error: 'invalid token' })

    // Find an existing admin, otherwise create a default admin user
    let admin = await prisma.user.findFirst({ where: { role: 'admin' } })
    if (!admin) {
      admin = await prisma.user.create({
        data: { phone: 'admin', name: 'Admin', password: '', role: 'admin' }
      })
    }

    const sessionToken = uuidv4()
    await prisma.$transaction([
      prisma.session.deleteMany({ where: { userId: admin.id } }),
      prisma.session.create({ data: { token: sessionToken, userId: admin.id } })
    ])

    res.json({ token: sessionToken, user: { id: admin.id, phone: admin.phone, role: admin.role || 'admin' } })
  } catch (e) {
    res.status(500).json({ error: 'Internal error' })
  }
})

export default router
