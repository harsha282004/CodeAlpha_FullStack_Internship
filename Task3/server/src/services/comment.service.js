import { prisma } from '../config/prisma.js'
import { AppError } from '../utils/AppError.js'
import { toCommentSummary } from '../utils/comment.js'
import { createNotifications } from './notification.service.js'
import { emitToProject } from '../realtime/socket.js'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const COMMENT_AUTHOR_SELECT = { id: true, name: true, username: true, avatarUrl: true }
const COMMENT_SELECT = {
  id: true,
  taskId: true,
  authorId: true,
  content: true,
  createdAt: true,
  updatedAt: true,
  author: { select: COMMENT_AUTHOR_SELECT },
}

function commentNotFoundError() {
  return new AppError('Comment not found', 404, 'COMMENT_NOT_FOUND')
}

function insufficientRoleError() {
  return new AppError('You do not have permission to perform this action', 403, 'INSUFFICIENT_PROJECT_ROLE')
}

// A comment id that belongs to a different task must behave exactly like a
// nonexistent comment — the same 404, no distinguishing detail — mirroring
// getTaskWithinBoard/getBoardWithinProject one level deeper. Used by every
// read/write below, not only the detail route.
async function getCommentWithinTask(taskId, commentId) {
  if (!UUID_REGEX.test(commentId)) {
    throw commentNotFoundError()
  }

  const comment = await prisma.comment.findUnique({ where: { id: commentId }, select: COMMENT_SELECT })
  if (!comment || comment.taskId !== taskId) {
    throw commentNotFoundError()
  }
  return comment
}

// authorId always comes from req.user.id (the verified JWT), never a body
// field — see comment.validator.js's field whitelist — so a comment can
// never be authored as someone else.
export async function createComment(projectId, taskId, authorId, { content }) {
  const comment = await prisma.comment.create({
    data: { taskId, authorId, content },
    select: COMMENT_SELECT,
  })
  const safe = toCommentSummary(comment)

  emitToProject(projectId, 'comment:created', { projectId, taskId, comment: safe })

  // Recipients: every assignee on the task, plus its creator (the spec's
  // "optionally include task creator"), minus the comment's own author —
  // deduplicated via a Set, since the creator might also be an assignee.
  // Message matches prisma/seed.js's own TASK_COMMENTED wording exactly,
  // for consistency between generated and seeded data.
  const [task, assignees] = await Promise.all([
    prisma.task.findUnique({ where: { id: taskId }, select: { title: true, createdById: true } }),
    prisma.taskAssignee.findMany({ where: { taskId }, select: { userId: true } }),
  ])
  const recipients = new Set(assignees.map((a) => a.userId))
  recipients.add(task.createdById)
  recipients.delete(authorId)

  if (recipients.size > 0) {
    await createNotifications(
      Array.from(recipients).map((userId) => ({
        userId,
        type: 'TASK_COMMENTED',
        message: `New comment on "${task.title}".`,
        projectId,
        taskId,
      })),
    )
  }

  return safe
}

// Ordered chronologically (oldest first) — the natural reading order for a
// conversation thread, unlike every other list in this project (which
// orders newest-relevant-first). `id` as a deterministic tiebreaker for
// same-millisecond timestamps.
export async function listComments(taskId, { page, limit }) {
  const where = { taskId }

  const [total, comments] = await Promise.all([
    prisma.comment.count({ where }),
    prisma.comment.findMany({
      where,
      select: COMMENT_SELECT,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ])

  return {
    comments: comments.map(toCommentSummary),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  }
}

export async function getComment(taskId, commentId) {
  const comment = await getCommentWithinTask(taskId, commentId)
  return toCommentSummary(comment)
}

// Only the comment's own author may edit it — not OWNER/ADMIN. Unlike
// project/board/task moderation, editing someone else's words isn't a
// management action this project's collaboration model grants to elevated
// roles; it stays exclusively with whoever wrote it.
export async function updateComment(projectId, taskId, commentId, callerId, { content }) {
  const comment = await getCommentWithinTask(taskId, commentId)

  if (comment.authorId !== callerId) {
    throw insufficientRoleError()
  }

  const updated = await prisma.comment.update({
    where: { id: commentId },
    data: { content },
    select: COMMENT_SELECT,
  })
  const safe = toCommentSummary(updated)

  emitToProject(projectId, 'comment:updated', { projectId, taskId, comment: safe })

  return safe
}

// The author may delete their own comment; OWNER/ADMIN may delete any
// comment in their project for moderation. An ordinary MEMBER may not
// delete someone else's comment. Only the Comment row is ever removed —
// the User, Task, Project, and ProjectMember are all untouched.
export async function deleteComment(projectId, taskId, commentId, callerId, callerRole) {
  const comment = await getCommentWithinTask(taskId, commentId)

  const isAuthor = comment.authorId === callerId
  const isModerator = callerRole === 'OWNER' || callerRole === 'ADMIN'
  if (!isAuthor && !isModerator) {
    throw insufficientRoleError()
  }

  await prisma.comment.delete({ where: { id: commentId } })

  emitToProject(projectId, 'comment:deleted', { projectId, taskId, commentId })
}
