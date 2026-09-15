import { Router } from 'express'
import healthRoutes from './health.routes.js'
import authRoutes from './auth.routes.js'

const router = Router()

router.use('/health', healthRoutes)
router.use('/auth', authRoutes)

// Mounted here in later phases, in this order:
//   router.use('/users', userRoutes)
//   router.use('/projects', projectRoutes)
//   router.use('/boards', boardRoutes)
//   router.use('/tasks', taskRoutes)
//   router.use('/comments', commentRoutes)
//   router.use('/notifications', notificationRoutes)

export default router
