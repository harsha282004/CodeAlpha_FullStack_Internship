import { Button } from './ui/Button'
import type { Pagination as PaginationMeta } from '../lib/api/types'

interface PaginationProps {
  pagination: PaginationMeta | null
  isLoadingMore: boolean
  onLoadMore: () => void
  itemLabel?: string
}

export function Pagination({ pagination, isLoadingMore, onLoadMore, itemLabel = 'items' }: PaginationProps) {
  if (!pagination || pagination.page >= pagination.totalPages) return null

  return (
    <div className="flex flex-col items-center gap-2 py-6">
      <Button variant="outline" onClick={onLoadMore} isLoading={isLoadingMore}>
        {isLoadingMore ? 'Loading' : 'Load more'}
      </Button>
      <p className="text-xs text-muted-foreground">
        Page {pagination.page} of {pagination.totalPages} &middot; {pagination.total} {itemLabel}
      </p>
    </div>
  )
}
