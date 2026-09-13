import { Router } from 'express'
import healthRoutes from './health.routes.js'
import authRoutes from './auth.routes.js'
import profileRoutes from './profile.routes.js'
import postRoutes from './post.routes.js'
import commentRoutes from './comment.routes.js'

const router = Router()

router.use('/health', healthRoutes)
router.use('/auth', authRoutes)
router.use('/users', profileRoutes)
router.use('/posts', postRoutes)
router.use('/comments', commentRoutes)

export default router
