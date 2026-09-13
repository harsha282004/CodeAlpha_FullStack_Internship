import { Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { AppShell } from '../layout/AppShell'
import { UserList } from './UserList'
import { FollowButton } from './FollowButton'
import { usePaginatedList } from '../../lib/hooks/usePaginatedList'
import { useAuth } from '../../lib/auth/AuthContext'
import type { PaginatedResult, PaginationParams, PublicUser } from '../../lib/api/types'

interface FollowListViewProps {
  username: string
  title: string
  fetcher: (username: string, params: PaginationParams) => Promise<PaginatedResult<PublicUser>>
  emptyTitle: string
  emptyDescription: string
}

/**
 * Shared shell for the /followers/:username and /following/:username pages
 * — same layout, only the data source and copy differ.
 */
export function FollowListView({ username, title, fetcher, emptyTitle, emptyDescription }: FollowListViewProps) {
  const { user: currentUser } = useAuth()
  const { items, pagination, isLoading, isLoadingMore, error, loadMore, refetch } = usePaginatedList<PublicUser>(
    (page) => fetcher(username, { page, limit: 20 }),
    [username],
  )

  return (
    <AppShell>
      <div className="flex items-center gap-3 border-b border-border px-4 py-4 sm:px-6">
        <Link
          to="/profile/$username"
          params={{ username }}
          aria-label="Back to profile"
          className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground">@{username}</p>
        </div>
      </div>
      <UserList
        users={items}
        pagination={pagination}
        isLoading={isLoading}
        isLoadingMore={isLoadingMore}
        error={error}
        onLoadMore={loadMore}
        onRetry={refetch}
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
        renderTrailing={(person) =>
          currentUser && currentUser.username !== person.username ? (
            <FollowButton username={person.username} size="sm" />
          ) : undefined
        }
      />
    </AppShell>
  )
}
