import {
  getPublicProfile as getPublicProfileService,
  getMyProfile as getMyProfileService,
  updateMyProfile as updateMyProfileService,
  searchUsers as searchUsersService,
} from '../services/profile.service.js'

export async function searchUsers(req, res, next) {
  try {
    const { users, pagination } = await searchUsersService(req.query.q, req.query)
    res.json({ success: true, data: { users, pagination } })
  } catch (error) {
    next(error)
  }
}

export async function getPublicProfile(req, res, next) {
  try {
    const user = await getPublicProfileService(req.params.username)
    res.json({ success: true, data: { user } })
  } catch (error) {
    next(error)
  }
}

export async function getMyProfile(req, res, next) {
  try {
    const user = await getMyProfileService(req.user.id)
    res.json({ success: true, data: { user } })
  } catch (error) {
    next(error)
  }
}

export async function updateMyProfile(req, res, next) {
  try {
    const user = await updateMyProfileService(req.user.id, req.body)
    res.json({ success: true, message: 'Profile updated', data: { user } })
  } catch (error) {
    next(error)
  }
}
