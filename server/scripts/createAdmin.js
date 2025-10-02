import { readFileSync, writeFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DB_PATH = path.join(__dirname, '..', 'db.json')

const [name, phone, password] = process.argv.slice(2)
if (!name || !phone || !password) {
  console.error('Usage: node scripts/createAdmin.js <name> <phone> <password>')
  process.exit(1)
}

const db = JSON.parse(readFileSync(DB_PATH, 'utf-8'))
db.users = db.users || []
if (db.users.find(u => String(u.phone) === String(phone))) {
  console.error('User already exists with phone:', phone)
  process.exit(1)
}
const user = { id: uuidv4(), name: String(name), phone: String(phone), password: String(password), role: 'admin' }
db.users.push(user)
writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8')
console.log('Admin created:', { id: user.id, name: user.name, phone: user.phone })


