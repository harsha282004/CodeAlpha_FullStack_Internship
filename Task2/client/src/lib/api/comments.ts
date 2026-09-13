import { apiFetch } from './client'
import type { Comment, Pagination, PaginatedResult, PaginationParams } from './types'

export interface CommentInput {
  content: string
}

export function createComment(postId: string, input: CommentInput): Promise<{ comment: Comment }> {
  return apiFetch(`/posts/${encodeURIComponent(postId)}/comments`, { method: 'POST', body: input, auth: true })
}

export async function listComments(
  postId: string,
  pagination: PaginationParams = {},
): Promise<PaginatedResult<Comment>> {
  const result = await apiFetch<{ comments: Comment[]; pagination: Pagination }>(
    `/posts/${encodeURIComponent(postId)}/comments`,
    { query: { page: pagination.page, limit: pagination.limit } },
  )
  return { items: result.comments, pagination: result.pagination }
}

export function updateComment(commentId: string, input: CommentInput): Promise<{ comment: Comment }> {
  return apiFetch(`/comments/${encodeURIComponent(commentId)}`, { method: 'PATCH', body: input, auth: true })
}

export function deleteComment(commentId: string): Promise<{ message: string }> {
  return apiFetch(`/comments/${encodeURIComponent(commentId)}`, { method: 'DELETE', auth: true })
}
