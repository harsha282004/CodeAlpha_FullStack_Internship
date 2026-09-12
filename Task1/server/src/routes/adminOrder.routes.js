import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import { requireAdmin } from '../middleware/requireAdmin.js'
import { getAllOrders, putOrderStatus } from '../controllers/adminOrder.controller.js'

const router = Router()

router.use(authenticate, requireAdmin)
router.get('/', getAllOrders)
router.put('/:id/status', putOrderStatus)

export default router
