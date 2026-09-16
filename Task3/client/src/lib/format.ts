import type { NotificationType } from './api'

// A short relative-time label. Deliberately simple (no library) — this app
// never needs anything beyond "a few minutes ago" granularity.
export function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffSec = Math.round(diffMs / 1000)
  if (diffSec < 5) return 'just now'
  if (diffSec < 60) return `${diffSec}s ago`
  const diffMin = Math.round(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHour = Math.round(diffMin / 60)
  if (diffHour < 24) return `${diffHour}h ago`
  const diffDay = Math.round(diffHour / 24)
  if (diffDay < 7) return `${diffDay}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

// The notification's own `message` (server-composed, e.g. `"Fix login
// bug" was updated.`) is always shown as the primary text — this is only a
// short category label shown alongside it, one per actual NotificationType
// the backend defines (see prisma/schema.prisma's NotificationType enum).
// Never invents an event the backend doesn't emit.
const NOTIFICATION_LABELS: Record<NotificationType, string> = {
  TASK_ASSIGNED: 'Task assigned',
  TASK_COMMENTED: 'New comment',
  TASK_UPDATED: 'Task updated',
  TASK_MOVED: 'Task moved',
  PROJECT_MEMBER_ADDED: 'Added to project',
}

export function notificationTypeLabel(type: NotificationType): string {
  return NOTIFICATION_LABELS[type]
}
