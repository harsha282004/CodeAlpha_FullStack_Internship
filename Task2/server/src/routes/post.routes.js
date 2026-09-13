import { Router } from 'express'
import { createPost, listPosts, getPost, updatePost, deletePost } from '../controllers/post.controller.js'
import { createComment, listComments } from '../controllers/comment.controller.js'
import { authenticate } from '../middleware/auth.js'
import likeRoutes from './like.routes.js'

const router = Router()

router.post('/', authenticate, createPost)
router.get('/', listPosts)

// Mounted/registered before the generic '/:postId' route below. Express
// wouldn't actually confuse these with it (different path depth), but
// registering the more specific routes first keeps this unambiguous either way.
router.use('/:postId/like', likeRoutes)
router.post('/:postId/comments', authenticate, createComment)
router.get('/:postId/comments', listComments)

router.get('/:postId', getPost)
router.patch('/:postId', authenticate, updatePost)
router.delete('/:postId', authenticate, deletePost)

export default router
