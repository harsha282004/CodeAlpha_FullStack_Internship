import { useCallback, useEffect, useState } from 'react'
import { ApiError, notificationsApi, type Notification } from '../lib/api'
import { useSocketEvent } from '../realtime/SocketContext'

interface NotificationReadPayload {
  notificationId?: string
  all?: boolean
}

// Shared by the header bell (unread count + recent list) and the dedicated
// /notifications-style panel — one hook, one source of truth, so the two
// never disagree about what's read. Reconciles with the two notification
// realtime events (see docs/REALTIME.md): a new notification is prepended
// and the count bumped without a refetch; a read event flips local state
// the same way a REST mark-as-read response already does.
export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [list, count] = await Promise.all([
        notificationsApi.list(1, 50),
        notificationsApi.unreadCount(),
      ])
      setNotifications(list.notifications)
      setUnreadCount(count.count)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useSocketEvent<Notification>('notification:new', (notification) => {
    setNotifications((current) => [notification, ...current])
    setUnreadCount((count) => count + 1)
  })

  useSocketEvent<NotificationReadPayload>('notification:read', (payload) => {
    if (payload.all) {
      setNotifications((current) => current.map((n) => ({ ...n, read: true })))
      setUnreadCount(0)
      return
    }
    if (payload.notificationId) {
      setNotifications((current) =>
        current.map((n) => (n.id === payload.notificationId ? { ...n, read: true } : n)),
      )
      setUnreadCount((count) => Math.max(0, count - 1))
    }
  })

  const markRead = useCallback(async (id: string) => {
    const wasUnread = notifications.find((n) => n.id === id)?.read === false
    setNotifications((current) => current.map((n) => (n.id === id ? { ...n, read: true } : n)))
    if (wasUnread) setUnreadCount((count) => Math.max(0, count - 1))
    await notificationsApi.markRead(id)
  }, [notifications])

  const markAllRead = useCallback(async () => {
    setNotifications((current) => current.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)
    await notificationsApi.markAllRead()
  }, [])

  const remove = useCallback(async (id: string) => {
    const target = notifications.find((n) => n.id === id)
    setNotifications((current) => current.filter((n) => n.id !== id))
    if (target && !target.read) setUnreadCount((count) => Math.max(0, count - 1))
    await notificationsApi.remove(id)
  }, [notifications])

  return { notifications, unreadCount, loading, error, reload: load, markRead, markAllRead, remove }
}
