import type { ReactNode } from 'react'
import { Users } from 'lucide-react'
import { UserCard } from './UserCard'
import { EmptyState } from '../ui/EmptyState'
import { ErrorState } from '../ui/ErrorState'
import { Skeleton } from '../ui/Skeleton'
import { Pagination } from '../Pagination'
import type { Pagination as PaginationMeta, PublicUser } from '../../lib/api/types'

interface UserListProps {
  users: PublicUser[]
  pagination: PaginationMeta | null
  isLoading: boolean
  isLoadingMore: boolean
  error: string | null
  onLoadMore: () => void
  onRetry?: () => void
  renderTrailing?: (user: PublicUser) => ReactNode
  emptyTitle?: string
  emptyDescription?: string
}

export function UserList({
  users,
  pagination,
  isLoading,
  isLoadingMore,
  error,
  onLoadMore,
  onRetry,
  renderTrailing,
  emptyTitle = 'Nobody here yet',
  emptyDescription,
}: UserListProps) {
  if (isLoading) {
    return (
      <div>
        {[0, 1, 2].map((key) => (
          <div key={key} className="flex items-center gap-3 border-b border-border px-4 py-3.5 sm:px-6">
            <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3.5 w-24" />
            </div>
          </div>
        ))}
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

  if (users.length === 0) {
    return (
      <div className="px-4 py-6 sm:px-6">
        <EmptyState icon={<Users className="h-5 w-5" />} title={emptyTitle} description={emptyDescription} />
      </div>
    )
  }

  return (
    <div>
      {users.map((user) => (
        <UserCard key={user.id} user={user} trailing={renderTrailing?.(user)} />
      ))}
      <Pagination pagination={pagination} isLoadingMore={isLoadingMore} onLoadMore={onLoadMore} itemLabel="people" />
    </div>
  )
}
