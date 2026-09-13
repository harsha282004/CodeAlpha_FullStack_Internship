import { Router } from 'express'
import { getPublicProfile, getMyProfile, updateMyProfile } from '../controllers/profile.controller.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

// /me must be registered before /:username so "me" is never matched as a username.
router.get('/me', authenticate, getMyProfile)
router.patch('/me', authenticate, updateMyProfile)
router.get('/:username', getPublicProfile)

export default router
