import { apiFetch } from './client'
import type { FeedPost, Pagination, PaginatedResult, PaginationParams } from './types'

export async function getFeed(pagination: PaginationParams = {}): Promise<PaginatedResult<FeedPost>> {
  const result = await apiFetch<{ posts: FeedPost[]; pagination: Pagination }>('/feed', {
    auth: true,
    query: { page: pagination.page, limit: pagination.limit },
  })
  return { items: result.posts, pagination: result.pagination }
}

export async function getExplore(pagination: PaginationParams = {}): Promise<PaginatedResult<FeedPost>> {
  const result = await apiFetch<{ posts: FeedPost[]; pagination: Pagination }>('/explore', {
    query: { page: pagination.page, limit: pagination.limit },
  })
  return { items: result.posts, pagination: result.pagination }
}
