import { del, get, patch, post } from './client'
import type { Pagination, Task, TaskPriority } from './types'

export interface CreateTaskInput {
  title: string
  description?: string | null
  priority?: TaskPriority
  position?: number
  dueDate?: string | null
}

// Deliberately no `boardId` field — the backend has no way to move a task
// to a different board in this phase (see task.validator.js's comment on
// why `status` is rejected, and task.service.js's updateTask). Only
// `position` (reordering within the same board) can change here.
export interface UpdateTaskInput {
  title?: string
  description?: string | null
  priority?: TaskPriority
  position?: number
  dueDate?: string | null
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
