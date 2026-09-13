import { apiFetch } from './client'
import type { FollowState, Pagination, PaginatedResult, PaginationParams, PublicUser } from './types'

export function followUser(username: string): Promise<FollowState> {
  return apiFetch(`/users/${encodeURIComponent(username)}/follow`, { method: 'POST', auth: true })
}

export function unfollowUser(username: string): Promise<FollowState> {
  return apiFetch(`/users/${encodeURIComponent(username)}/follow`, { method: 'DELETE', auth: true })
}

export function getFollowStatus(username: string): Promise<FollowState> {
  return apiFetch(`/users/${encodeURIComponent(username)}/follow`, { auth: true })
}

export async function listFollowers(
  username: string,
  pagination: PaginationParams = {},
): Promise<PaginatedResult<PublicUser>> {
  const result = await apiFetch<{ users: PublicUser[]; pagination: Pagination }>(
    `/users/${encodeURIComponent(username)}/followers`,
    { query: { page: pagination.page, limit: pagination.limit } },
  )
  return { items: result.users, pagination: result.pagination }
}

export async function listFollowing(
  username: string,
  pagination: PaginationParams = {},
): Promise<PaginatedResult<PublicUser>> {
  const result = await apiFetch<{ users: PublicUser[]; pagination: Pagination }>(
    `/users/${encodeURIComponent(username)}/following`,
    { query: { page: pagination.page, limit: pagination.limit } },
  )
  return { items: result.users, pagination: result.pagination }
}
