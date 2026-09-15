import { Router } from 'express'
import healthRoutes from './health.routes.js'

const router = Router()

router.use('/health', healthRoutes)

// Mounted here in later phases, in this order:
//   router.use('/auth', authRoutes)
//   router.use('/users', userRoutes)
//   router.use('/projects', projectRoutes)
//   router.use('/boards', boardRoutes)
//   router.use('/tasks', taskRoutes)
//   router.use('/comments', commentRoutes)
//   router.use('/notifications', notificationRoutes)

export default router
