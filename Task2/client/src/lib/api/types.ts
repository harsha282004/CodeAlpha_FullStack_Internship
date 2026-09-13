// Mirrors the actual Express/Prisma response shapes (server/src/services/*),
// not an assumed or idealized structure. Keep these in sync with the backend.

export interface PublicUser {
  id: string
  name: string
  username: string
  bio: string | null
  avatarUrl: string | null
  createdAt: string
}

export interface PrivateUser extends PublicUser {
  email: string
  updatedAt: string
}

export interface PostAuthor {
  id: string
  name: string
  username: string
  avatarUrl: string | null
}

export interface Post {
  id: string
  content: string
  imageUrl: string | null
  createdAt: string
  updatedAt: string
  author: PostAuthor
  likeCount: number
  commentCount: number
}

// Feed/explore posts additionally know whether the viewer liked them —
// /api/posts has no authentication, so that can't be computed there
// (server/src/services/feed.service.js vs post.service.js).
export interface FeedPost extends Post {
  likedByMe: boolean
}

export interface Comment {
  id: string
  content: string
  createdAt: string
  updatedAt: string
  author: PostAuthor
}

export interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface LikeState {
  liked: boolean
  likeCount: number
}

export interface FollowState {
  following: boolean
  followerCount: number
  followingCount: number
}

export interface PaginatedResult<T> {
  items: T[]
  pagination: Pagination
}

export interface PaginationParams {
  page?: number
  limit?: number
}
