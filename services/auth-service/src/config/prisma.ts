import { PrismaClient } from '@prisma/client'

// Singleton pattern — one single DB connection shared across the entire service
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error']
})

export default prisma
