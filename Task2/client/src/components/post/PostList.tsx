import { Newspaper } from 'lucide-react'
import { PostCard } from './PostCard'
import { PostCardSkeleton } from './PostCardSkeleton'
import { EmptyState } from '../ui/EmptyState'
import { ErrorState } from '../ui/ErrorState'
import { Pagination } from '../Pagination'
import type { Pagination as PaginationMeta, Post } from '../../lib/api/types'

interface PostListProps {
  posts: Array<Post & { likedByMe?: boolean }>
  pagination: PaginationMeta | null
  isLoading: boolean
  isLoadingMore: boolean
  error: string | null
  onLoadMore: () => void
  onRetry?: () => void
  onDeleted: (postId: string) => void
  onUpdated: (post: Post) => void
  emptyTitle?: string
  emptyDescription?: string
}

export function PostList({
  posts,
  pagination,
  isLoading,
  isLoadingMore,
  error,
  onLoadMore,
  onRetry,
  onDeleted,
  onUpdated,
  emptyTitle = 'No posts yet',
  emptyDescription = 'When there is something to show, it will appear here.',
}: PostListProps) {
  if (isLoading) {
    return (
      <div>
        <PostCardSkeleton />
        <PostCardSkeleton />
        <PostCardSkeleton />
      </div>
    )
  }

  if (error) {
    return (
      <div className="px-4 py-6 sm:px-6">
        <ErrorState message={error} onRetry={onRetry} />
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="px-4 py-6 sm:px-6">
        <EmptyState icon={<Newspaper className="h-5 w-5" />} title={emptyTitle} description={emptyDescription} />
      </div>
    )
  }

  return (
    <div>
      {posts.map((post) => (
        <PostCard key={post.id} post={post} onDeleted={onDeleted} onUpdated={onUpdated} />
      ))}
      <Pagination pagination={pagination} isLoadingMore={isLoadingMore} onLoadMore={onLoadMore} itemLabel="posts" />
    </div>
  )
}
