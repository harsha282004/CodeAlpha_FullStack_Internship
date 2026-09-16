import { del, get, patch } from './client'
import type { Notification, Pagination } from './types'

export const notificationsApi = {
  list: (page?: number, limit?: number) =>
    get<{ notifications: Notification[]; pagination: Pagination }>('/notifications', { page, limit }),
  unreadCount: () => get<{ count: number }>('/notifications/unread-count'),
  markRead: (notificationId: string) =>
    patch<{ notification: Notification }>(`/notifications/${notificationId}/read`),
  markAllRead: () => patch<{ updatedCount: number }>('/notifications/read-all'),
  remove: (notificationId: string) => del<{ message: string }>(`/notifications/${notificationId}`),
}
