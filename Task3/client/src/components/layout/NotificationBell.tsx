import { useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useNotifications } from '../../hooks/useNotifications'
import { notificationTypeLabel, timeAgo } from '../../lib/format'
import { EmptyState } from '../ui/Feedback'

// Header entry point for notifications (Phase 14.13) — a dropdown rather
// than a dedicated page, since the full list is short and paginated
// client-side interaction (mark read/all/delete) doesn't need its own
// route. Closes on outside click and on Escape, like every other overlay
// in this app.
export function NotificationBell() {
  const { notifications, unreadCount, loading, markRead, markAllRead, remove } = useNotifications()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
      >
        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM8.5 16a1.5 1.5 0 003 0h-3z" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">Notifications</p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllRead()}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-500"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="tf-scroll max-h-96 overflow-y-auto">
            {loading ? (
              <p className="px-4 py-6 text-center text-sm text-slate-500">Loading…</p>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-6">
                <EmptyState title="You're all caught up." />
              </div>
            ) : (
              <ul>
                {notifications.map((notification) => (
                  <li
                    key={notification.id}
                    className={`group flex gap-2 border-b border-slate-50 px-4 py-3 last:border-0 ${
                      notification.read ? '' : 'bg-indigo-50/50'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => !notification.read && markRead(notification.id)}
                      className="flex-1 text-left"
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                        {notificationTypeLabel(notification.type)}
                      </p>
                      <p className="mt-0.5 text-sm text-slate-700">{notification.message}</p>
                      <p className="mt-1 text-xs text-slate-400">{timeAgo(notification.createdAt)}</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(notification.id)}
                      aria-label="Delete notification"
                      className="self-start rounded p-1 text-slate-300 opacity-0 hover:bg-slate-100 hover:text-slate-500 group-hover:opacity-100"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path
                          fillRule="evenodd"
                          d="M9 2a1 1 0 00-1 1v1H4.5a.5.5 0 000 1H5v11a2 2 0 002 2h6a2 2 0 002-2V5h.5a.5.5 0 000-1H12V3a1 1 0 00-1-1H9zm3 5a.5.5 0 00-1 0v8a.5.5 0 001 0V7zm-4 0a.5.5 0 00-1 0v8a.5.5 0 001 0V7z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {notifications.length > 0 && (
            <div className="border-t border-slate-100 px-4 py-2 text-center">
              <Link
                to="/app/dashboard"
                onClick={() => setOpen(false)}
                className="text-xs font-medium text-slate-500 hover:text-slate-700"
              >
                Back to dashboard
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
