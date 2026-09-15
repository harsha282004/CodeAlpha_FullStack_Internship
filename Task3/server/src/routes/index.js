import { Router } from 'express'
import healthRoutes from './health.routes.js'
import authRoutes from './auth.routes.js'
import profileRoutes from './profile.routes.js'
import projectRoutes from './project.routes.js'

const router = Router()

router.use('/health', healthRoutes)
router.use('/auth', authRoutes)
router.use('/users', profileRoutes)
router.use('/projects', projectRoutes)

// Mounted here in later phases, in this order:
//   router.use('/boards', boardRoutes)
//   router.use('/tasks', taskRoutes)
//   router.use('/comments', commentRoutes)
//   router.use('/notifications', notificationRoutes)

export default router
