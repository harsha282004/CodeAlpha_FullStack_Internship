import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import { requireAdmin } from '../middleware/requireAdmin.js'
import { getStats } from '../controllers/adminStats.controller.js'

const router = Router()

router.use(authenticate, requireAdmin)
router.get('/', getStats)

export default router
