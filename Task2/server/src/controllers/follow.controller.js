import {
  followUser as followUserService,
  unfollowUser as unfollowUserService,
  getFollowStatus as getFollowStatusService,
  listFollowers as listFollowersService,
  listFollowing as listFollowingService,
} from '../services/follow.service.js'

export async function followUser(req, res, next) {
  try {
    const result = await followUserService(req.user.id, req.params.username, req.body)
    res.json({ success: true, data: result })
  } catch (error) {
    next(error)
  }
}

export async function unfollowUser(req, res, next) {
  try {
    const result = await unfollowUserService(req.user.id, req.params.username, req.body)
    res.json({ success: true, data: result })
  } catch (error) {
    next(error)
  }
}

export async function getFollowStatus(req, res, next) {
  try {
    const result = await getFollowStatusService(req.user.id, req.params.username)
    res.json({ success: true, data: result })
  } catch (error) {
    next(error)
  }
}

export async function listFollowers(req, res, next) {
  try {
    const { users, pagination } = await listFollowersService(req.params.username, req.query)
    res.json({ success: true, data: { users, pagination } })
  } catch (error) {
    next(error)
  }
}

export async function listFollowing(req, res, next) {
  try {
    const { users, pagination } = await listFollowingService(req.params.username, req.query)
    res.json({ success: true, data: { users, pagination } })
  } catch (error) {
    next(error)
  }
}
