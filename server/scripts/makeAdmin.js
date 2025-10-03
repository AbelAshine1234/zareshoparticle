import prisma from '../prisma/client.js'


//phone arg
const phoneArg = process.argv[2]
if (!phoneArg) {
  console.error('Usage: node scripts/makeAdmin.js <phone>')
  process.exit(1)
}

try {
  const user = await prisma.user.findUnique({ where: { phone: String(phoneArg) } })
  if (!user) {
    console.error('User not found for phone:', phoneArg)
    process.exit(1)
  }

  if ((user.role || 'user') === 'admin') {
    console.log('User is already admin:', { id: user.id, phone: user.phone })
    process.exit(0)
  }

  const updated = await prisma.user.update({ where: { id: user.id }, data: { role: 'admin' }, select: { id: true, phone: true, role: true } })
  console.log('Promoted to admin:', updated)
  process.exit(0)
} catch (e) {
  console.error('Failed to promote user to admin:', e?.message || e)
  process.exit(1)
}


