import { Router } from 'express'
import { updateComment, deleteComment } from '../controllers/comment.controller.js'
import { authenticate } from '../middleware/auth.js'

// Handles the top-level /api/comments/:commentId routes. The nested
// /api/posts/:postId/comments create/list routes live in post.routes.js,
// since they're scoped to a post rather than a comment.
const router = Router()

router.patch('/:commentId', authenticate, updateComment)
router.delete('/:commentId', authenticate, deleteComment)

export default router
