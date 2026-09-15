import { prisma } from '../config/prisma.js'
import { AppError } from '../utils/AppError.js'
import { toTaskSummary } from '../utils/task.js'

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
// without a redundant second check here.
async function getTaskWithinBoard(boardId, taskId) {
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
  return toTaskSummary(task)
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

export async function updateTask(boardId, taskId, update) {
  await getTaskWithinBoard(boardId, taskId)

  const task = await prisma.task.update({
    where: { id: taskId },
    data: update,
    select: TASK_SELECT,
  })
  return toTaskSummary(task)
}

export async function deleteTask(boardId, taskId) {
  await getTaskWithinBoard(boardId, taskId)

  // TaskAssignee, Comment, and this task's own Notification rows all
  // cascade at the schema level (onDelete: Cascade); Activity.taskId nulls
  // out instead (SetNull) so a project's timeline entry survives even
  // after the task it references is gone (see DATABASE_SCHEMA.md). Phases
  // 9/10 haven't introduced assignee/comment creation yet, so no such row
  // can currently reference any task — documented here so the cascade
  // isn't a surprise once those exist.
  await prisma.task.delete({ where: { id: taskId } })
}
