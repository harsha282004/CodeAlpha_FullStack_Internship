import { del, get, patch, post } from './client'
import type { Pagination, Task, TaskPriority } from './types'

export interface CreateTaskInput {
  title: string
  description?: string | null
  priority?: TaskPriority
  position?: number
  dueDate?: string | null
}

// `boardId` moves a task to a different board — this app's equivalent of
// dragging a Kanban card to a different column, since a Board *is* the
// column (there's no separate status field — see task.validator.js). The
// backend re-verifies the target board belongs to the same project on
// every request, so this can never smuggle a task into another project's
// board even if a caller supplied one.
export interface UpdateTaskInput {
  title?: string
  description?: string | null
  priority?: TaskPriority
  position?: number
  dueDate?: string | null
  boardId?: string
}

export const tasksApi = {
  list: (projectId: string, boardId: string, page?: number, limit?: number) =>
    get<{ tasks: Task[]; pagination: Pagination }>(
      `/projects/${projectId}/boards/${boardId}/tasks`,
      { page, limit },
    ),
  create: (projectId: string, boardId: string, input: CreateTaskInput) =>
    post<{ task: Task }>(`/projects/${projectId}/boards/${boardId}/tasks`, input),
  get: (projectId: string, boardId: string, taskId: string) =>
    get<{ task: Task }>(`/projects/${projectId}/boards/${boardId}/tasks/${taskId}`),
  update: (projectId: string, boardId: string, taskId: string, input: UpdateTaskInput) =>
    patch<{ task: Task }>(`/projects/${projectId}/boards/${boardId}/tasks/${taskId}`, input),
  remove: (projectId: string, boardId: string, taskId: string) =>
    del<{ message: string }>(`/projects/${projectId}/boards/${boardId}/tasks/${taskId}`),
}
