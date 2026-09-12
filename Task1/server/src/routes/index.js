import { Router } from 'express'
import healthRoutes from './health.routes.js'
import authRoutes from './auth.routes.js'
import productRoutes from './product.routes.js'
import orderRoutes from './order.routes.js'
import adminOrderRoutes from './adminOrder.routes.js'

const router = Router()

router.use('/health', healthRoutes)
router.use('/auth', authRoutes)
router.use('/products', productRoutes)
router.use('/orders', orderRoutes)
router.use('/admin/orders', adminOrderRoutes)

export default router
