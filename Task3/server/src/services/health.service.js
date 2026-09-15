import { prisma } from '../config/prisma.js'
import { AppError } from '../utils/AppError.js'

export async function checkDatabaseHealth() {
  try {
    // Cheapest possible round-trip that still proves Prisma can reach
    // PostgreSQL — no table dependency, so this works even before migrations.
    await prisma.$queryRaw`SELECT 1`
  } catch (error) {
    // Logged in full server-side (may include connection detail); the
    // client only ever sees the generic AppError message below.
    console.error('Database health check failed:', error)
    throw new AppError('Database connection is unhealthy', 503, 'DATABASE_UNHEALTHY')
  }
}
