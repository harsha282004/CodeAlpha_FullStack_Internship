import { prisma } from '../config/prisma.js'

export function getHealth(req, res) {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  })
}

export async function getDatabaseHealth(req, res, next) {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.json({ status: 'ok', database: 'connected' })
  } catch (error) {
    next(error)
  }
}
