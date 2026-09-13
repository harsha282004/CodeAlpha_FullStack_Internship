import { useEffect, useRef } from 'react'
import { MessageCircle } from 'lucide-react'
import { Sheet } from '../ui/Sheet'
import { CommentComposer } from './CommentComposer'
import { CommentItem } from './CommentItem'
import { EmptyState } from '../ui/EmptyState'
import { ErrorState } from '../ui/ErrorState'
import { Skeleton } from '../ui/Skeleton'
import { Pagination } from '../Pagination'
import { listComments } from '../../lib/api/comments'
import { usePaginatedList } from '../../lib/hooks/usePaginatedList'
import type { Comment } from '../../lib/api/types'

interface CommentSheetProps {
  postId: string
  isOpen: boolean
  onClose: () => void
  onCountChange: (total: number) => void
}

const EMPTY_PAGE = { items: [] as Comment[], pagination: { page: 1, limit: 10, total: 0, totalPages: 1 } }

export function CommentSheet({ postId, isOpen, onClose, onCountChange }: CommentSheetProps) {
  // Fetch nothing at all while closed — deps flipping `isOpen` triggers the
  // real request only once the sheet is actually opened.
  const { items, pagination, isLoading, isLoadingMore, error, loadMore, removeItem, updateItem, setItems } =
    usePaginatedList<Comment>(
      (page) => (isOpen ? listComments(postId, { page, limit: 10 }) : Promise.resolve(EMPTY_PAGE)),
      [postId, isOpen],
    )

  const totalRef = useRef(0)
  useEffect(() => {
    if (pagination && pagination.total !== totalRef.current) {
      totalRef.current = pagination.total
      onCountChange(pagination.total)
    }
  }, [pagination, onCountChange])

  function handleCreated(comment: Comment) {
    setItems((current) => [comment, ...current])
    totalRef.current += 1
    onCountChange(totalRef.current)
  }

  function handleDeleted(commentId: string) {
    removeItem((comment) => comment.id === commentId)
    totalRef.current = Math.max(totalRef.current - 1, 0)
    onCountChange(totalRef.current)
  }

  function handleUpdated(updated: Comment) {
    updateItem(
      (comment) => comment.id === updated.id,
      () => updated,
    )
  }

  return (
    <Sheet isOpen={isOpen} onClose={onClose} title="Comments">
      <div className="flex h-full max-h-[70vh] flex-col sm:max-h-[60vh]">
        <div className="flex-1 divide-y divide-border overflow-y-auto px-4">
          {isLoading && (
            <div className="space-y-4 py-4">
              {[0, 1, 2].map((key) => (
                <div key={key} className="flex gap-3">
                  <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-2 pt-1">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isLoading && error && (
            <div className="py-4">
              <ErrorState message={error} />
            </div>
          )}

          {!isLoading && !error && items.length === 0 && (
            <div className="py-4">
              <EmptyState
                icon={<MessageCircle className="h-5 w-5" />}
                title="No comments yet"
                description="Be the first to share your thoughts."
              />
            </div>
          )}

          {!isLoading &&
            !error &&
            items.map((comment) => (
              <CommentItem key={comment.id} comment={comment} onDeleted={handleDeleted} onUpdated={handleUpdated} />
            ))}

          {!isLoading && !error && (
            <Pagination pagination={pagination} isLoadingMore={isLoadingMore} onLoadMore={loadMore} itemLabel="comments" />
          )}
        </div>
        <CommentComposer postId={postId} onCreated={handleCreated} />
      </div>
    </Sheet>
  )
}
