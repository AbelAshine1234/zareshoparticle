import { readFileSync, writeFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DB_PATH = path.join(__dirname, '..', 'db.json')

const phoneArg = process.argv[2]
if (!phoneArg) {
  console.error('Usage: node scripts/makeAdmin.js <phone>')
  process.exit(1)
}

const db = JSON.parse(readFileSync(DB_PATH, 'utf-8'))
const user = (db.users || []).find(u => String(u.phone) === String(phoneArg))
if (!user) {
  console.error('User not found for phone:', phoneArg)
  process.exit(1)
}
user.role = 'admin'
writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8')
console.log('Promoted to admin:', { id: user.id, phone: user.phone })


