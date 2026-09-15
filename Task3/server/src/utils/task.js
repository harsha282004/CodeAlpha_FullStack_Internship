// Explicit allow-list, never a spread of the raw Prisma row — same
// discipline as utils/user.js, utils/project.js, and utils/board.js.
export function toTaskSummary(task) {
  return {
    id: task.id,
    projectId: task.projectId,
    boardId: task.boardId,
    title: task.title,
    description: task.description ?? null,
    priority: task.priority,
    position: task.position,
    dueDate: task.dueDate ?? null,
    createdById: task.createdById,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  }
}
