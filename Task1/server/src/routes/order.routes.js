import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import { postOrder, getOrders, getOrder } from '../controllers/order.controller.js'

const router = Router()

router.use(authenticate)
router.post('/', postOrder)
router.get('/', getOrders)
router.get('/:id', getOrder)

export default router
