import { getAdminStats } from '../services/adminStats.service.js'

export async function getStats(req, res, next) {
  try {
    const stats = await getAdminStats()
    res.json({ stats })
  } catch (error) {
    next(error)
  }
}
