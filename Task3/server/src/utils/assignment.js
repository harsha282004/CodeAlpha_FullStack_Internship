// A task assignee as seen by other members of the same project — only the
// public-facing user fields, plus the assignment-specific assignedAt. Same
// allow-list discipline as utils/project.js's toMemberSummary: never
// email, never passwordHash, never a spread of the raw Prisma row.
export function toAssigneeSummary(assignee) {
  return {
    id: assignee.user.id,
    name: assignee.user.name,
    username: assignee.user.username,
    avatarUrl: assignee.user.avatarUrl ?? null,
    assignedAt: assignee.assignedAt,
  }
}
