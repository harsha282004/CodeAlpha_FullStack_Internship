import { apiFetch } from './client'
import type { Pagination, PaginatedResult, PaginationParams, Post } from './types'

export interface CreatePostInput {
  content: string
  imageUrl?: string | null
}

export interface UpdatePostInput {
  content?: string
  imageUrl?: string | null
}

export function createPost(input: CreatePostInput): Promise<{ post: Post }> {
  return apiFetch('/posts', { method: 'POST', body: input, auth: true })
}

export interface ListPostsParams extends PaginationParams {
  /** Filters to one author's posts (used by the profile page). */
  username?: string
}

export async function listPosts(params: ListPostsParams = {}): Promise<PaginatedResult<Post>> {
  const result = await apiFetch<{ posts: Post[]; pagination: Pagination }>('/posts', {
    query: { page: params.page, limit: params.limit, username: params.username },
  })
  return { items: result.posts, pagination: result.pagination }
}

export function getPost(postId: string): Promise<{ post: Post }> {
  return apiFetch(`/posts/${encodeURIComponent(postId)}`)
}

export function updatePost(postId: string, input: UpdatePostInput): Promise<{ post: Post }> {
  return apiFetch(`/posts/${encodeURIComponent(postId)}`, { method: 'PATCH', body: input, auth: true })
}

export function deletePost(postId: string): Promise<{ message: string }> {
  return apiFetch(`/posts/${encodeURIComponent(postId)}`, { method: 'DELETE', auth: true })
}
