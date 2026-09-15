import { validateUpdateProfileInput, validateSearchQuery } from '../validators/profile.validator.js'
import {
  getPublicProfile,
  getCurrentProfile,
  updateCurrentProfile,
  searchUsers,
} from '../services/profile.service.js'

export async function getPublicProfileController(req, res) {
  const user = await getPublicProfile(req.params.username)
  res.status(200).json({ success: true, data: { user } })
}

export async function getCurrentProfileController(req, res) {
  const user = await getCurrentProfile(req.user.id)
  res.status(200).json({ success: true, data: { user } })
}

export async function updateCurrentProfileController(req, res) {
  const update = validateUpdateProfileInput(req.body)
  const user = await updateCurrentProfile(req.user.id, update)
  res.status(200).json({ success: true, data: { user } })
}

export async function searchUsersController(req, res) {
  const query = validateSearchQuery(req.query)
  const result = await searchUsers(query)
  res.status(200).json({ success: true, data: result })
}
