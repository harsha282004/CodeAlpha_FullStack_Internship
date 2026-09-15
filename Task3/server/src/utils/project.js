// Explicit allow-list, never a spread of the raw Prisma row — same
// discipline as utils/user.js. `role` and `memberCount` aren't columns on
// Project itself (role comes from the caller's ProjectMember row,
// memberCount from a separate aggregate), so both are passed in by the
// caller rather than expected on the `project` argument.
export function toProjectSummary(project, { role, memberCount } = {}) {
  const summary = {
    id: project.id,
    name: project.name,
    description: project.description ?? null,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  }
  if (role !== undefined) {
    summary.role = role
  }
  if (memberCount !== undefined) {
    summary.memberCount = memberCount
  }
  return summary
}

// A project member as seen by other members of the same project — only the
// public-facing user fields, plus the membership-specific role/joinedAt.
// Never passwordHash, never email — this isn't the place to look someone's
// email up just because you happen to share a project with them.
export function toMemberSummary(member) {
  return {
    id: member.user.id,
    name: member.user.name,
    username: member.user.username,
    avatarUrl: member.user.avatarUrl ?? null,
    role: member.role,
    joinedAt: member.joinedAt,
  }
}
