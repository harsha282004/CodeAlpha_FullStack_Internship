import { Router } from 'express'
import { getPublicProfile, getMyProfile, updateMyProfile } from '../controllers/profile.controller.js'
import { authenticate } from '../middleware/auth.js'
import followRoutes from './follow.routes.js'

const router = Router()

// /me must be registered before /:username so "me" is never matched as a username.
router.get('/me', authenticate, getMyProfile)
router.patch('/me', authenticate, updateMyProfile)

// Mounted before the generic '/:username' route below so the nested
// /follow, /followers, /following sub-paths are handled here first. A bare
// '/:username' request falls through this router untouched (it has no route
// for its own base path) and reaches getPublicProfile below as before.
router.use('/:username', followRoutes)

router.get('/:username', getPublicProfile)

export default router
