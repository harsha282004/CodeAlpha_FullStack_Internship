import { Router } from 'express'
import healthRoutes from './health.routes.js'

const router = Router()

router.use('/health', healthRoutes)

// auth, projects, boards, tasks, comments, and notifications routes are
// added in later phases.

export default router
