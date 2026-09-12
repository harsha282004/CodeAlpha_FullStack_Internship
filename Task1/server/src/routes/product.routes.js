import { Router } from 'express'
import {
  getProducts,
  getProduct,
  postProduct,
  putProduct,
  removeProduct,
} from '../controllers/product.controller.js'
import { authenticate } from '../middleware/auth.js'
import { requireAdmin } from '../middleware/requireAdmin.js'

const router = Router()

router.get('/', getProducts)
router.get('/:slug', getProduct)
router.post('/', authenticate, requireAdmin, postProduct)
router.put('/:id', authenticate, requireAdmin, putProduct)
router.delete('/:id', authenticate, requireAdmin, removeProduct)

export default router
