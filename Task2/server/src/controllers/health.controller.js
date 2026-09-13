import { checkDatabaseHealth } from '../services/health.service.js'

export function getHealth(req, res) {
  res.json({
    success: true,
    message: 'Connectly API is running',
  })
}

export async function getDatabaseHealth(req, res, next) {
  try {
    await checkDatabaseHealth()
    res.json({
      success: true,
      message: 'Database connection is healthy',
    })
  } catch (error) {
    next(error)
  }
}
