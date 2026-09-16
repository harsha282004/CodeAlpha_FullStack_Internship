// Explicit allow-list, never a spread of the raw Prisma row — same
// discipline as every other serializer in this project. Notification rows
// have no sensitive fields, but the allow-list is kept anyway so this
// stays the one place that decides what a notification response contains.
export function toNotificationSummary(notification) {
  return {
    id: notification.id,
    type: notification.type,
    message: notification.message,
    projectId: notification.projectId ?? null,
    taskId: notification.taskId ?? null,
    read: notification.read,
    createdAt: notification.createdAt,
  }
}
