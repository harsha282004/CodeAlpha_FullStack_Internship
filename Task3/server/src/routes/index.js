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

// Board routes are nested under /projects/:projectId/boards (mounted from
// within project.routes.js), task routes one level deeper under
// /projects/:projectId/boards/:boardId/tasks (mounted from within
// board.routes.js), and assignee routes one level deeper still under
// .../tasks/:taskId/assignees (mounted from within task.routes.js) — not
// here in any case; see those files.
//
// Mounted here in later phases, in this order:
//   router.use('/comments', commentRoutes)
//   router.use('/notifications', notificationRoutes)

export default router
