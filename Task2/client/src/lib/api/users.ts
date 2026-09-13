import { apiFetch } from './client'
import type { Pagination, PaginatedResult, PaginationParams, PrivateUser, PublicUser } from './types'

export function getPublicProfile(username: string): Promise<{ user: PublicUser }> {
  return apiFetch(`/users/${encodeURIComponent(username)}`)
}

export function getMyProfile(): Promise<{ user: PrivateUser }> {
  return apiFetch('/users/me', { auth: true })
}

export interface UpdateProfileInput {
  name?: string
  username?: string
  bio?: string | null
  avatarUrl?: string | null
}

export function updateMyProfile(input: UpdateProfileInput): Promise<{ user: PrivateUser }> {
  return apiFetch('/users/me', { method: 'PATCH', body: input, auth: true })
}

export async function searchUsers(
  query: string,
  pagination: PaginationParams = {},
): Promise<PaginatedResult<PublicUser>> {
  const result = await apiFetch<{ users: PublicUser[]; pagination: Pagination }>('/users/search', {
    query: { q: query, page: pagination.page, limit: pagination.limit },
  })
  return { items: result.users, pagination: result.pagination }
}
