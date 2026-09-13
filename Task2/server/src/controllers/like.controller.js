import {
  likePost as likePostService,
  unlikePost as unlikePostService,
  getPostLikeStatus as getPostLikeStatusService,
} from '../services/like.service.js'

export async function likePost(req, res, next) {
  try {
    const result = await likePostService(req.user.id, req.params.postId, req.body)
    res.json({ success: true, data: result })
  } catch (error) {
    next(error)
  }
}

export async function unlikePost(req, res, next) {
  try {
    const result = await unlikePostService(req.user.id, req.params.postId, req.body)
    res.json({ success: true, data: result })
  } catch (error) {
    next(error)
  }
}

export async function getLikeStatus(req, res, next) {
  try {
    const result = await getPostLikeStatusService(req.user.id, req.params.postId)
    res.json({ success: true, data: result })
  } catch (error) {
    next(error)
  }
}
