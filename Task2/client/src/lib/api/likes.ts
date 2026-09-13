import { apiFetch } from './client'
import type { LikeState } from './types'

export function likePost(postId: string): Promise<LikeState> {
  return apiFetch(`/posts/${encodeURIComponent(postId)}/like`, { method: 'POST', auth: true })
}

export function unlikePost(postId: string): Promise<LikeState> {
  return apiFetch(`/posts/${encodeURIComponent(postId)}/like`, { method: 'DELETE', auth: true })
}

export function getLikeStatus(postId: string): Promise<LikeState> {
  return apiFetch(`/posts/${encodeURIComponent(postId)}/like`, { auth: true })
}
