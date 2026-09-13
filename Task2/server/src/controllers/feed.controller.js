import { getFeed as getFeedService, getExplore as getExploreService } from '../services/feed.service.js'

export async function getFeed(req, res, next) {
  try {
    const { posts, pagination } = await getFeedService(req.user.id, req.query)
    res.json({ success: true, data: { posts, pagination } })
  } catch (error) {
    next(error)
  }
}

export async function getExplore(req, res, next) {
  try {
    const { posts, pagination } = await getExploreService(req.query)
    res.json({ success: true, data: { posts, pagination } })
  } catch (error) {
    next(error)
  }
}
