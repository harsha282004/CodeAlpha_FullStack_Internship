import { del, get, patch, post } from './client'
import type { Comment, Pagination } from './types'

const base = (projectId: string, boardId: string, taskId: string) =>
  `/projects/${projectId}/boards/${boardId}/tasks/${taskId}/comments`

export const commentsApi = {
  list: (projectId: string, boardId: string, taskId: string, page?: number, limit?: number) =>
    get<{ comments: Comment[]; pagination: Pagination }>(base(projectId, boardId, taskId), { page, limit }),
  create: (projectId: string, boardId: string, taskId: string, content: string) =>
    post<{ comment: Comment }>(base(projectId, boardId, taskId), { content }),
  update: (projectId: string, boardId: string, taskId: string, commentId: string, content: string) =>
    patch<{ comment: Comment }>(`${base(projectId, boardId, taskId)}/${commentId}`, { content }),
  remove: (projectId: string, boardId: string, taskId: string, commentId: string) =>
    del<{ message: string }>(`${base(projectId, boardId, taskId)}/${commentId}`),
}
