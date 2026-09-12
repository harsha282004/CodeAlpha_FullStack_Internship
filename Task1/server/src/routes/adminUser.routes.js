import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import { requireAdmin } from '../middleware/requireAdmin.js'
import { getUsers } from '../controllers/adminUser.controller.js'

const router = Router()

router.use(authenticate, requireAdmin)
router.get('/', getUsers)

export default router
