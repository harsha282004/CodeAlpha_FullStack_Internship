// Explicit allow-list, never a spread of the raw Prisma row — same
// discipline as utils/user.js and utils/project.js.
export function toBoardSummary(board) {
  return {
    id: board.id,
    projectId: board.projectId,
    name: board.name,
    position: board.position,
    createdAt: board.createdAt,
    updatedAt: board.updatedAt,
  }
}
