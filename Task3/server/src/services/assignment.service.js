import { Prisma } from '@prisma/client'
import { prisma } from '../config/prisma.js'
import { AppError } from '../utils/AppError.js'
import { toAssigneeSummary } from '../utils/assignment.js'
import { createNotification } from './notification.service.js'
import { emitToProject } from '../realtime/socket.js'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Only the public-facing user fields — no email, no bio, no createdAt.
// Sharing a task with someone doesn't need those.
const ASSIGNEE_USER_SELECT = { id: true, name: true, username: true, avatarUrl: true }

function assignmentNotFoundError() {
  return new AppError('Assignment not found', 404, 'ASSIGNMENT_NOT_FOUND')
}

// A malformed :userId path segment can never match a real assignment —
// treated as "not found" rather than a validation error, consistent with
// membership.service.js's assertValidUserId and every other hierarchy
// check in this project.
function assertValidUserId(userId) {
  if (typeof userId !== 'string' || !UUID_REGEX.test(userId)) {
    throw assignmentNotFoundError()
  }
}

// The check that's genuinely new to this phase: an assignee must already
// be a member of the task's project. Prisma has no way to express this as
// a foreign key — TaskAssignee.userId and ProjectMember are unrelated
// tables from the database's point of view — so it's enforced here, in
// application code, before the TaskAssignee row is ever created. This is
// exactly the "later phase" business rule DATABASE_SCHEMA.md and
// ARCHITECTURE.md's Section 13 have anticipated since Phase 2.
//
// No explicit $transaction wraps this lookup-then-create: the actual
// guarantee against a duplicate (taskId, userId) row is the composite
// primary key itself (see the P2002 catch below), the same pattern
// membership.service.js's addMember already uses for duplicate
// ProjectMember rows — two concurrent requests for the same pair can only
// ever result in one row, enforced by Postgres, not by application-level
// locking.
// actorId is req.user.id (the verified JWT) — used only to skip notifying
// someone about a self-assignment (an OWNER/ADMIN assigning themselves
// already knows), never trusted for anything else.
export async function addAssignee(projectId, taskId, actorId, targetUserId) {
  const [targetUser, membership, task] = await Promise.all([
    prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true } }),
    prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: targetUserId } },
      select: { userId: true },
    }),
    prisma.task.findUnique({ where: { id: taskId }, select: { title: true } }),
  ])
  if (!targetUser) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND')
  }
  if (!membership) {
    // Distinct from "user not found" — this user exists, just not in this
    // project — but kept in the same 404 family rather than a 403, since
    // this describes the *target's* eligibility as an assignee, not
    // whether the requester is authorized (that's already been checked by
    // requireProjectRole before this function ever runs).
    throw new AppError('User is not a member of this project', 404, 'USER_NOT_A_PROJECT_MEMBER')
  }

  let assignee
  try {
    assignee = await prisma.taskAssignee.create({
      data: { taskId, userId: targetUserId },
      select: { assignedAt: true, user: { select: ASSIGNEE_USER_SELECT } },
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new AppError('User is already assigned to this task', 409, 'ASSIGNMENT_ALREADY_EXISTS')
    }
    throw error
  }

  const safe = toAssigneeSummary(assignee)

  emitToProject(projectId, 'task:assigned', { projectId, taskId, assignee: safe })

  // Never notify someone about assigning themselves — a distinct case from
  // every other trigger in this project, since here the recipient and the
  // actor can genuinely be the same person (an OWNER/ADMIN assigning
  // themselves to their own task).
  if (targetUserId !== actorId) {
    await createNotification({
      userId: targetUserId,
      type: 'TASK_ASSIGNED',
      message: `You were assigned to "${task.title}".`,
      projectId,
      taskId,
    })
  }

  return safe
}

// Ordered by assignedAt ascending — deterministic ("who was assigned
// first"), the same tiebreaker style ProjectMember uses for joinedAt.
export async function listAssignees(taskId) {
  const assignees = await prisma.taskAssignee.findMany({
    where: { taskId },
    select: { assignedAt: true, user: { select: ASSIGNEE_USER_SELECT } },
    orderBy: { assignedAt: 'asc' },
  })
  return assignees.map(toAssigneeSummary)
}

// Whether a specific project member is assigned to this task. Note this
// never needs to separately check the target's project membership the way
// addAssignee does — if they weren't (or aren't anymore) a project member,
// no TaskAssignee row could exist for them in the first place, so the
// absence of a row already implies "not assigned," which is exactly the
// answer this endpoint gives.
export async function getAssignmentStatus(taskId, targetUserId) {
  assertValidUserId(targetUserId)

  const assignee = await prisma.taskAssignee.findUnique({
    where: { taskId_userId: { taskId, userId: targetUserId } },
    select: { assignedAt: true, user: { select: ASSIGNEE_USER_SELECT } },
  })
  if (!assignee) {
    throw assignmentNotFoundError()
  }
  return toAssigneeSummary(assignee)
}

// Removes only the TaskAssignee row — never the User, the ProjectMember,
// or the Task itself. There is nothing else to cascade: TaskAssignee is a
// pure join row with no children of its own.
export async function removeAssignee(projectId, taskId, targetUserId) {
  assertValidUserId(targetUserId)

  const assignee = await prisma.taskAssignee.findUnique({
    where: { taskId_userId: { taskId, userId: targetUserId } },
    select: { userId: true },
  })
  if (!assignee) {
    throw assignmentNotFoundError()
  }

  await prisma.taskAssignee.delete({ where: { taskId_userId: { taskId, userId: targetUserId } } })

  emitToProject(projectId, 'task:unassigned', { projectId, taskId, userId: targetUserId })
}
