import { del, get, post } from './client'
import type { Assignee } from './types'

const base = (projectId: string, boardId: string, taskId: string) =>
  `/projects/${projectId}/boards/${boardId}/tasks/${taskId}/assignees`

export const assigneesApi = {
  list: (projectId: string, boardId: string, taskId: string) =>
    get<{ assignees: Assignee[] }>(base(projectId, boardId, taskId)),
  add: (projectId: string, boardId: string, taskId: string, userId: string) =>
    post<{ assignee: Assignee }>(base(projectId, boardId, taskId), { userId }),
  remove: (projectId: string, boardId: string, taskId: string, userId: string) =>
    del<{ message: string }>(`${base(projectId, boardId, taskId)}/${userId}`),
}
