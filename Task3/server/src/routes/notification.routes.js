import { Router } from 'express'
import { requireAuth } from '../middleware/auth.middleware.js'
import {
  listNotificationsController,
  getUnreadCountController,
  markAsReadController,
  markAllAsReadController,
  deleteNotificationController,
} from '../controllers/notification.controller.js'

const router = Router()

// Notifications are user-scoped, not project-scoped — every route here
// only ever touches req.user.id's own rows (enforced in
// notification.service.js), so the only gate needed is authentication.
router.use(requireAuth)

// 'unread-count' is a distinct static path from anything dynamic below it
// — no route-ordering hazard — but registered first for readability.
router.get('/unread-count', getUnreadCountController)
router.get('/', listNotificationsController)

// 'read-all' (one static segment) and '/:notificationId/read' (two
// segments) can't collide regardless of order, but registered in this
// order for the same readability reason.
router.patch('/read-all', markAllAsReadController)
router.patch('/:notificationId/read', markAsReadController)

router.delete('/:notificationId', deleteNotificationController)

export default router
