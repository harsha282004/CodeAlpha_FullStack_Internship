import { get, patch } from './client'
import type { CurrentUser, Pagination, PublicUser } from './types'

export interface UpdateProfileInput {
  name?: string
  username?: string
  bio?: string
  avatarUrl?: string
}

export const usersApi = {
  getMe: () => get<{ user: CurrentUser }>('/users/me'),
  updateMe: (input: UpdateProfileInput) => patch<{ user: CurrentUser }>('/users/me', input),
  getPublicProfile: (username: string) => get<{ user: PublicUser }>(`/users/${encodeURIComponent(username)}`),
  // q is required by the backend (an empty search term is rejected, not
  // treated as "match everyone") — see profile.validator.js.
  search: (q: string, page?: number, limit?: number) =>
    get<{ users: PublicUser[]; pagination: Pagination }>('/users/search', { q, page, limit }),
}
