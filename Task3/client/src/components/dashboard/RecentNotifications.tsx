import { Link } from '@tanstack/react-router'
import { Bell, BellOff } from 'lucide-react'
import { Card } from '../ui/Card'
import { Skeleton } from '../ui/Feedback'
import { notificationTypeLabel, timeAgo } from '../../lib/format'
import type { Notification } from '../../lib/api'

interface RecentNotificationsProps {
  notifications: Notification[]
  loading: boolean
  onMarkRead: (id: string) => void
}

export function RecentNotifications({ notifications, loading, onMarkRead }: RecentNotificationsProps) {
  const recent = notifications.slice(0, 5)

  return (
    <Card className="rounded-[20px] p-6 sm:p-7">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900 sm:text-[22px]">Recent notifications</h2>
        <Link
          to="/app/dashboard"
          className="text-sm font-semibold text-indigo-600 transition-colors hover:text-indigo-500"
        >
          View all →
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3 pt-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : recent.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <BellOff className="h-7 w-7" aria-hidden="true" strokeWidth={1.75} />
          </span>
          <div className="space-y-1">
            <p className="text-lg font-bold text-slate-900">You're all caught up!</p>
            <p className="text-sm text-slate-500">No new notifications for now.</p>
          </div>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {recent.map((notification) => (
            <li key={notification.id}>
              <button
                type="button"
                onClick={() => !notification.read && onMarkRead(notification.id)}
                className={`flex w-full items-start gap-3 py-3.5 text-left transition-colors hover:bg-slate-50 sm:rounded-xl sm:px-2 ${
                  notification.read ? '' : 'bg-indigo-50/40'
                }`}
              >
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                  <Bell className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
                    {notificationTypeLabel(notification.type)}
                  </p>
                  <p className="mt-0.5 text-sm text-slate-700">{notification.message}</p>
                  <p className="mt-1 text-xs text-slate-400">{timeAgo(notification.createdAt)}</p>
                </div>
                {!notification.read && (
                  <span
                    className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-500"
                    aria-label="Unread"
                    title="Unread"
                  />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
