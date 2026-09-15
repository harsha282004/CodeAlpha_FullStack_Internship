import { Prisma } from '@prisma/client'
import { prisma } from '../config/prisma.js'
import { AppError } from '../utils/AppError.js'
import { toMemberSummary } from '../utils/project.js'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Only the public-facing user fields — no email, no bio, no createdAt.
// Someone sharing a project with you doesn't need those.
const MEMBER_USER_SELECT = { id: true, name: true, username: true, avatarUrl: true }

function membershipNotFoundError() {
  return new AppError('Membership not found', 404, 'MEMBERSHIP_NOT_FOUND')
}

// A malformed :userId path segment can never match a real membership —
// treated as "not found" rather than a validation 400, consistent with how
// requireProjectMember treats a malformed :projectId.
function assertValidUserId(userId) {
  if (typeof userId !== 'string' || !UUID_REGEX.test(userId)) {
    throw membershipNotFoundError()
  }
}

// A single insert after a single read — no multi-step write needs
// coordinating, so (unlike createProject) a transaction wouldn't add
// anything here; the P2002 catch below is what actually guarantees no
// duplicate membership, the same pattern auth.service.js's registerUser
// uses for duplicate accounts.
export async function addMember(projectId, { userId, role }) {
  const targetUser = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
  if (!targetUser) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND')
  }

  try {
    const membership = await prisma.projectMember.create({
      data: { projectId, userId, role },
      select: { role: true, joinedAt: true, user: { select: MEMBER_USER_SELECT } },
    })
    return toMemberSummary(membership)
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new AppError('User is already a member of this project', 409, 'MEMBERSHIP_ALREADY_EXISTS')
    }
    throw error
  }
}

// Ordered by role first: Postgres enums sort by declaration order
// (OWNER, ADMIN, MEMBER in schema.prisma), so this naturally lists the
// owner first, then admins, then members — deterministic without an
// explicit CASE expression. joinedAt as the tiebreaker within a role.
export async function listMembers(projectId) {
  const members = await prisma.projectMember.findMany({
    where: { projectId },
    select: { role: true, joinedAt: true, user: { select: MEMBER_USER_SELECT } },
    orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
  })
  return members.map(toMemberSummary)
}

export async function removeMember(projectId, targetUserId) {
  assertValidUserId(targetUserId)

  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: targetUserId } },
    select: { role: true },
  })

  if (!membership) {
    throw membershipNotFoundError()
  }

  if (membership.role === 'OWNER') {
    // The owner leaves a project by deleting it (or, in a later phase,
    // transferring ownership) — never by being removed as if they were an
    // ordinary member. This applies regardless of who is asking, including
    // another OWNER-only endpoint caller — there is exactly one OWNER and
    // this isn't how that fact ever changes.
    throw new AppError('The project owner cannot be removed', 403, 'CANNOT_REMOVE_OWNER')
  }

  await prisma.projectMember.delete({
    where: { projectId_userId: { projectId, userId: targetUserId } },
  })
}

export async function changeMemberRole(projectId, targetUserId, newRole) {
  assertValidUserId(targetUserId)

  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: targetUserId } },
    select: { role: true },
  })

  if (!membership) {
    throw membershipNotFoundError()
  }

  if (membership.role === 'OWNER') {
    // There is exactly one OWNER per project, set at creation — this
    // endpoint changes between ADMIN and MEMBER only (enforced already by
    // the validator's role whitelist) and never touches the owner's row.
    throw new AppError("The project owner's role cannot be changed here", 403, 'CANNOT_CHANGE_OWNER_ROLE')
  }

  const updated = await prisma.projectMember.update({
    where: { projectId_userId: { projectId, userId: targetUserId } },
    data: { role: newRole },
    select: { role: true, joinedAt: true, user: { select: MEMBER_USER_SELECT } },
  })

  return toMemberSummary(updated)
}
