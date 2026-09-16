import { validateListNotificationsQuery } from '../validators/notification.validator.js'
import {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from '../services/notification.service.js'

export async function listNotificationsController(req, res) {
  const query = validateListNotificationsQuery(req.query)
  const result = await getUserNotifications(req.user.id, query)
  res.status(200).json({ success: true, data: result })
}

export async function getUnreadCountController(req, res) {
  const count = await getUnreadCount(req.user.id)
  res.status(200).json({ success: true, data: { count } })
}

export async function markAsReadController(req, res) {
  const notification = await markAsRead(req.user.id, req.params.notificationId)
  res.status(200).json({ success: true, data: { notification } })
}

export async function markAllAsReadController(req, res) {
  const updatedCount = await markAllAsRead(req.user.id)
  res.status(200).json({ success: true, data: { updatedCount } })
}

export async function deleteNotificationController(req, res) {
  await deleteNotification(req.user.id, req.params.notificationId)
  res.status(200).json({ success: true, message: 'Notification deleted' })
}
