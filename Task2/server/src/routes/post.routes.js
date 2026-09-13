import { Router } from 'express'
import { createPost, listPosts, getPost, updatePost, deletePost } from '../controllers/post.controller.js'
import { authenticate } from '../middleware/auth.js'
import likeRoutes from './like.routes.js'

const router = Router()

router.post('/', authenticate, createPost)
router.get('/', listPosts)

// Mounted before the generic '/:postId' route below. Express wouldn't
// actually confuse the two (different path depth), but registering the more
// specific route first keeps this unambiguous either way.
router.use('/:postId/like', likeRoutes)

router.get('/:postId', getPost)
router.patch('/:postId', authenticate, updatePost)
router.delete('/:postId', authenticate, deletePost)

export default router
