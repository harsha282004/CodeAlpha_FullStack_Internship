import { prisma } from '../config/prisma.js'

export async function checkDatabaseHealth() {
  try {
    await prisma.$queryRaw`SELECT 1`
  } catch (error) {
    console.error('Database health check failed:', error)

    const dbError = new Error('Database connection is unhealthy')
    dbError.status = 503
    throw dbError
  }
}
