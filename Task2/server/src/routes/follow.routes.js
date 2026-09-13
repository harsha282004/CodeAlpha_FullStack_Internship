import { Router } from 'express'
import {
  followUser,
  unfollowUser,
  getFollowStatus,
  listFollowers,
  listFollowing,
} from '../controllers/follow.controller.js'
import { authenticate } from '../middleware/auth.js'

// mergeParams so this router (mounted at '/:username' in profile.routes.js)
// can read the parent's :username param.
const router = Router({ mergeParams: true })

router.post('/follow', authenticate, followUser)
router.get('/follow', authenticate, getFollowStatus)
router.delete('/follow', authenticate, unfollowUser)
router.get('/followers', listFollowers)
router.get('/following', listFollowing)

export default router
