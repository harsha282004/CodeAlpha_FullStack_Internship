import { prisma } from '../config/prisma.js'
import { AppError } from '../utils/AppError.js'
import { toTaskSummary } from '../utils/task.js'
import { createNotifications } from './notification.service.js'
import { emitToProject } from '../realtime/socket.js'
import { getBoardWithinProject } from './board.service.js'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const TASK_SELECT = {
  id: true,
  projectId: true,
  boardId: true,
  title: true,
  description: true,
  priority: true,
  position: true,
  dueDate: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
}

function taskNotFoundError() {
  return new AppError('Task not found', 404, 'TASK_NOT_FOUND')
}

// A task id that belongs to a different board must behave exactly like a
// nonexistent task — the same 404, no distinguishing detail — mirroring
// board.service.js's getBoardWithinProject. Used by every read/write below,
// not only the detail route, so PATCH/DELETE can't reach across boards
// either. Checking against boardId alone is sufficient: requireBoardInProject
// has already confirmed this boardId belongs to the request's projectId, so
// the projectId ↔ boardId ↔ task chain is fully verified transitively
// without a redundant second check here. Exported so requireTaskInBoard
// (Phase 9's task-auth middleware, gating every nested assignee route) can
// reuse this exact check instead of duplicating the same query.
export async function getTaskWithinBoard(boardId, taskId) {
  if (!UUID_REGEX.test(taskId)) {
    throw taskNotFoundError()
  }

  const task = await prisma.task.findUnique({ where: { id: taskId }, select: TASK_SELECT })
  if (!task || task.boardId !== boardId) {
    throw taskNotFoundError()
  }
  return task
}

async function nextPosition(boardId) {
  const result = await prisma.task.aggregate({
    where: { boardId },
    _max: { position: true },
  })
  return (result._max.position ?? -1) + 1
}

// projectId/boardId always come from the already-verified URL hierarchy
// (never a body field — see task.validator.js's field whitelist), and
// createdById is always the authenticated caller, never client-supplied.
export async function createTask(projectId, boardId, createdById, input) {
  const resolvedPosition = input.position ?? (await nextPosition(boardId))

  const data = {
    projectId,
    boardId,
    createdById,
    title: input.title,
    position: resolvedPosition,
  }
  if ('description' in input) {
    data.description = input.description
  }
  if ('priority' in input) {
    data.priority = input.priority
  }
  if ('dueDate' in input) {
    data.dueDate = input.dueDate
  }

  const task = await prisma.task.create({ data, select: TASK_SELECT })
  const safe = toTaskSummary(task)
  emitToProject(projectId, 'task:created', { projectId, boardId, task: safe })
  return safe
}

// Ordered by position, then createdAt, then id — the third tiebreaker
// guarantees a total order even in the (currently unprevented) case of two
// tasks sharing both a position and a createdAt timestamp.
export async function listTasks(boardId, { page, limit }) {
  const where = { boardId }

  const [total, tasks] = await Promise.all([
    prisma.task.count({ where }),
    prisma.task.findMany({
      where,
      select: TASK_SELECT,
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ])

  return {
    tasks: tasks.map(toTaskSummary),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  }
}

export async function getTask(boardId, taskId) {
  const task = await getTaskWithinBoard(boardId, taskId)
  return toTaskSummary(task)
}

// Dates compare by value (Prisma returns a Date instance; the validator
// parses dueDate into one too), everything else by strict equality — used
// to tell "the client resent the same value" apart from "this field
// actually changed," so a no-op PATCH never fires an event or notification.
function valuesDiffer(a, b) {
  if (a instanceof Date || b instanceof Date) {
    const aTime = a === null || a === undefined ? null : new Date(a).getTime()
    const bTime = b === null || b === undefined ? null : new Date(b).getTime()
    return aTime !== bTime
  }
  return a !== b
}

const CONTENT_FIELDS = ['title', 'description', 'priority', 'dueDate']

// actorId is always req.user.id (the verified JWT) — used only to exclude
// the person making the change from their own "this task changed"
// notification, never trusted for anything else.
export async function updateTask(boardId, taskId, actorId, update) {
  const before = await getTaskWithinBoard(boardId, taskId)

  const data = { ...update }

  // Moving a task to a different board is this project's equivalent of a
  // Kanban drag between columns — a Board *is* the column (see
  // task.validator.js), so this is a real, guarded write to a real column,
  // never a fabricated "status" concept. The target board is re-verified
  // fresh from the database against this task's own (already-trusted)
  // projectId — never the client's say-so — so a task can never be moved
  // into a board belonging to a different project; an attempt is treated
  // identically to a nonexistent board (404), the same convention every
  // other cross-project access in this app already uses.
  const boardChanging = 'boardId' in update && update.boardId !== before.boardId
  if (boardChanging) {
    await getBoardWithinProject(before.projectId, update.boardId)
    // No explicit position supplied alongside the move — append to the end
    // of the destination board rather than colliding with whatever's
    // already at position 0 there.
    if (!('position' in update)) {
      data.position = await nextPosition(update.boardId)
    }
  }

  const task = await prisma.task.update({
    where: { id: taskId },
    data,
    select: TASK_SELECT,
  })
  const safe = toTaskSummary(task)

  // "Moved" covers both a same-board reorder (position changes) and a
  // cross-board move (boardId changes) — either is this project's only
  // concept of a task's workflow stage changing. Both are computed against
  // the pre-update snapshot, not just "was the field present in the
  // request body," so resending an unchanged value is correctly treated as
  // a no-op.
  const movedWithinBoard = 'position' in update && valuesDiffer(update.position, before.position)
  const moved = boardChanging || movedWithinBoard
  const contentChanged = CONTENT_FIELDS.some((field) => field in update && valuesDiffer(update[field], before[field]))

  // Real-time events reach everyone watching the project board, regardless
  // of assignment — assignment only narrows who gets a *notification*,
  // handled separately below. `task.boardId` (the post-update value) is
  // used here rather than the URL's original `boardId`, since after a
  // cross-board move the event needs to describe where the task actually
  // ended up, not where it started — the frontend's own realtime handler
  // already keys off `task.boardId` for exactly this reason.
  if (moved) {
    emitToProject(task.projectId, 'task:moved', { projectId: task.projectId, boardId: task.boardId, task: safe })
  }
  if (contentChanged) {
    emitToProject(task.projectId, 'task:updated', { projectId: task.projectId, boardId: task.boardId, task: safe })
  }

  if (moved || contentChanged) {
    const assignees = await prisma.taskAssignee.findMany({ where: { taskId }, select: { userId: true } })
    const recipients = new Set(assignees.map((a) => a.userId))
    recipients.delete(actorId)

    if (recipients.size > 0) {
      const notifications = []
      if (moved) {
        notifications.push(
          ...Array.from(recipients).map((userId) => ({
            userId,
            type: 'TASK_MOVED',
            message: `"${task.title}" was moved.`,
            projectId: task.projectId,
            taskId,
          })),
        )
      }
      if (contentChanged) {
        notifications.push(
          ...Array.from(recipients).map((userId) => ({
            userId,
            type: 'TASK_UPDATED',
            message: `"${task.title}" was updated.`,
            projectId: task.projectId,
            taskId,
          })),
        )
      }
      await createNotifications(notifications)
    }
  }

  return safe
}

export async function deleteTask(boardId, taskId) {
  const task = await getTaskWithinBoard(boardId, taskId)

  // TaskAssignee, Comment, and this task's own Notification rows all
  // cascade at the schema level (onDelete: Cascade); Activity.taskId nulls
  // out instead (SetNull) so a project's timeline entry survives even
  // after the task it references is gone (see DATABASE_SCHEMA.md).
  await prisma.task.delete({ where: { id: taskId } })

  emitToProject(task.projectId, 'task:deleted', { projectId: task.projectId, boardId, taskId })
}
