import { getAllUsersAdmin } from '../services/auth.service.js'

export async function getUsers(req, res, next) {
  try {
    const result = await getAllUsersAdmin(req.query)
    res.json(result)
  } catch (error) {
    next(error)
  }
}
