import { Router } from 'express'
import { getFeed, getExplore } from '../controllers/feed.controller.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.get('/feed', authenticate, getFeed)
router.get('/explore', getExplore)

export default router
