import { del, get, patch, post } from './client'
import type { Board } from './types'

export interface CreateBoardInput {
  name: string
  position?: number
}

export interface UpdateBoardInput {
  name?: string
  position?: number
}

export const boardsApi = {
  list: (projectId: string) => get<{ boards: Board[] }>(`/projects/${projectId}/boards`),
  create: (projectId: string, input: CreateBoardInput) =>
    post<{ board: Board }>(`/projects/${projectId}/boards`, input),
  get: (projectId: string, boardId: string) =>
    get<{ board: Board }>(`/projects/${projectId}/boards/${boardId}`),
  update: (projectId: string, boardId: string, input: UpdateBoardInput) =>
    patch<{ board: Board }>(`/projects/${projectId}/boards/${boardId}`, input),
  remove: (projectId: string, boardId: string) =>
    del<{ message: string }>(`/projects/${projectId}/boards/${boardId}`),
}
