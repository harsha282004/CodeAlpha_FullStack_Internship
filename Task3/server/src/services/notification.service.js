import { prisma } from '../config/prisma.js'
import { AppError } from '../utils/AppError.js'
import { toNotificationSummary } from '../utils/notification.js'
import { emitToUser } from '../realtime/socket.js'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const NOTIFICATION_SELECT = {
  id: true,
  type: true,
  message: true,
  projectId: true,
  taskId: true,
  read: true,
  createdAt: true,
}

function notificationNotFoundError() {
  return new AppError('Notification not found', 404, 'NOTIFICATION_NOT_FOUND')
}

// A malformed :notificationId can never match a real row — treated as
// "not found," consistent with every other id check in this project.
function assertValidId(id) {
  if (typeof id !== 'string' || !UUID_REGEX.test(id)) {
    throw notificationNotFoundError()
  }
}

// The one generic primitive every domain service (membership, task,
// assignment, comment) calls after its own mutation has already committed
// — this file has no opinion on *when* a notification should be created or
// *who* should receive one; that business logic belongs to whichever
// service just did something notification-worthy. This function only
// knows how to create one row and deliver it in real time.
export async function createNotification({ userId, type, message, projectId, taskId }) {
  const notification = await prisma.notification.create({
    data: {
      userId,
      type,
      message,
      projectId: projectId ?? null,
      taskId: taskId ?? null,
    },
    select: NOTIFICATION_SELECT,
  })
  const safe = toNotificationSummary(notification)
  emitToUser(userId, 'notification:new', safe)
  return safe
}

// Fan-out to several recipients from one event (e.g. every assignee on a
// commented-on task). Recipients are expected to already be deduplicated
// and filtered (e.g. "never the comment's own author") by the caller, which
// is the only place that knows its own exclusion rules.
export async function createNotifications(entries) {
  return Promise.all(entries.map((entry) => createNotification(entry)))
}

// Newest first, with `id` as a deterministic tiebreaker for any
// same-millisecond createdAt values.
export async function getUserNotifications(userId, { page, limit }) {
  const where = { userId }

  const [total, notifications] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.findMany({
      where,
      select: NOTIFICATION_SELECT,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ])

  return {
    notifications: notifications.map(toNotificationSummary),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  }
}

// A single COUNT query — never "fetch everything and count in JavaScript."
export async function getUnreadCount(userId) {
  return prisma.notification.count({ where: { userId, read: false } })
}

// A notification belonging to someone else is reported identically to one
// that doesn't exist at all — a user should never learn that a given
// notification id belongs to someone else, the same discipline
// requireProjectMember uses for project existence vs. membership.
async function getOwnNotificationOrThrow(userId, notificationId) {
  assertValidId(notificationId)

  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
    select: { userId: true },
  })
  if (!notification || notification.userId !== userId) {
    throw notificationNotFoundError()
  }
}

// Idempotent by design: marking an already-read notification read again is
// a no-op success, not an error — a client retrying or double-clicking
// shouldn't need to check state first.
export async function markAsRead(userId, notificationId) {
  await getOwnNotificationOrThrow(userId, notificationId)

  const updated = await prisma.notification.update({
    where: { id: notificationId },
    data: { read: true },
    select: NOTIFICATION_SELECT,
  })
  const safe = toNotificationSummary(updated)
  emitToUser(userId, 'notification:read', { id: safe.id })
  return safe
}

// Scoped to `userId` in the WHERE clause itself — never "fetch all unread,
// filter in JavaScript, update one by one." Only touches this user's own
// unread notifications; nobody else's rows are ever in scope.
export async function markAllAsRead(userId) {
  const result = await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  })
  if (result.count > 0) {
    emitToUser(userId, 'notification:read', { all: true })
  }
  return result.count
}

export async function deleteNotification(userId, notificationId) {
  await getOwnNotificationOrThrow(userId, notificationId)
  await prisma.notification.delete({ where: { id: notificationId } })
}
