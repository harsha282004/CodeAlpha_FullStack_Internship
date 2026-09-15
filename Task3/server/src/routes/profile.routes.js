import { Router } from 'express'
import { requireAuth } from '../middleware/auth.middleware.js'
import {
  getPublicProfileController,
  getCurrentProfileController,
  updateCurrentProfileController,
  searchUsersController,
} from '../controllers/profile.controller.js'

const router = Router()

// /search and /me MUST be registered before the /:username catch-all —
// otherwise Express would match "GET /search" or "GET /me" as a username
// lookup instead of these routes.
router.get('/search', searchUsersController)
router.get('/me', requireAuth, getCurrentProfileController)
router.patch('/me', requireAuth, updateCurrentProfileController)
router.get('/:username', getPublicProfileController)

export default router
