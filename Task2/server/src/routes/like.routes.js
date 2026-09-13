import { Router } from 'express'
import { likePost, unlikePost, getLikeStatus } from '../controllers/like.controller.js'
import { authenticate } from '../middleware/auth.js'

// mergeParams so this router (mounted at '/:postId/like' in post.routes.js)
// can read the parent's :postId param.
const router = Router({ mergeParams: true })

router.post('/', authenticate, likePost)
router.get('/', authenticate, getLikeStatus)
router.delete('/', authenticate, unlikePost)

export default router
