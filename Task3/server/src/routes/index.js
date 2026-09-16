import { Router } from 'express'
import healthRoutes from './health.routes.js'
import authRoutes from './auth.routes.js'
import profileRoutes from './profile.routes.js'
import projectRoutes from './project.routes.js'
import notificationRoutes from './notification.routes.js'

const router = Router()

router.use('/health', healthRoutes)
router.use('/auth', authRoutes)
router.use('/users', profileRoutes)
router.use('/projects', projectRoutes)
router.use('/notifications', notificationRoutes)

// Board routes are nested under /projects/:projectId/boards (mounted from
// within project.routes.js), task routes one level deeper under
// /projects/:projectId/boards/:boardId/tasks (mounted from within
// board.routes.js), and assignee/comment routes one level deeper still
// under .../tasks/:taskId/assignees and .../tasks/:taskId/comments
// (mounted from within task.routes.js) — not here in any case; see those
// files. /api/notifications is the one exception: notifications are
// user-scoped, not project/board/task-scoped, so it's a top-level resource
// mounted directly here, like /auth and /users.

export default router
