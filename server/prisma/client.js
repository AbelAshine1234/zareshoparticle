import { PrismaClient } from '@prisma/client'

// Prevent creating multiple instances in dev with hot-reload
const globalForPrisma = globalThis

const prisma = globalForPrisma.prisma || new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
