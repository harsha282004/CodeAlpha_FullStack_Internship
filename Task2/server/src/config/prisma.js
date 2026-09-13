import { PrismaClient } from '@prisma/client'
import './env.js'

// Single shared client for the whole process. Prisma manages its own
// connection pool internally and connects lazily on first query, so there is
// no manual connect()/disconnect() per request. Caching it on `globalThis` in
// development avoids spawning a new client (and pool) on every file change
// under --watch.
const globalForPrisma = globalThis

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
