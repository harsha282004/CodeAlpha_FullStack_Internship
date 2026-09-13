import { Router } from 'express'
import healthRoutes from './health.routes.js'
import authRoutes from './auth.routes.js'
import profileRoutes from './profile.routes.js'
import postRoutes from './post.routes.js'
import commentRoutes from './comment.routes.js'
import feedRoutes from './feed.routes.js'

const router = Router()

router.use('/health', healthRoutes)
router.use('/auth', authRoutes)
router.use('/users', profileRoutes)
router.use('/posts', postRoutes)
router.use('/comments', commentRoutes)
// feedRoutes defines the absolute paths '/feed' and '/explore' itself, so it
// is mounted at the router root rather than under a shared prefix.
router.use('/', feedRoutes)

export default router
