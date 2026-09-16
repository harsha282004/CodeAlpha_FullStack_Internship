// Explicit allow-list, never a spread of the raw Prisma row — same
// discipline as every other serializer in this project. The author is the
// same public-facing shape used for board/task assignee summaries — no
// email, no passwordHash.
export function toCommentSummary(comment) {
  return {
    id: comment.id,
    taskId: comment.taskId,
    content: comment.content,
    author: {
      id: comment.author.id,
      name: comment.author.name,
      username: comment.author.username,
      avatarUrl: comment.author.avatarUrl ?? null,
    },
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
  }
}
