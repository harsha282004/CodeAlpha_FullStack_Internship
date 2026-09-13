import { Router } from 'express'
import { createPost, listPosts, getPost, updatePost, deletePost } from '../controllers/post.controller.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.post('/', authenticate, createPost)
router.get('/', listPosts)
router.get('/:postId', getPost)
router.patch('/:postId', authenticate, updatePost)
router.delete('/:postId', authenticate, deletePost)

export default router
