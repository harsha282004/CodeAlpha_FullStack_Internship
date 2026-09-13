import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Search as SearchIcon } from 'lucide-react'
import { AppShell } from '../components/layout/AppShell'
import { SearchBar } from '../components/search/SearchBar'
import { UserList } from '../components/profile/UserList'
import { EmptyState } from '../components/ui/EmptyState'
import { usePaginatedList } from '../lib/hooks/usePaginatedList'
import { useDebouncedValue } from '../lib/hooks/useDebouncedValue'
import { searchUsers } from '../lib/api/users'
import type { PublicUser } from '../lib/api/types'

export const Route = createFileRoute('/search')({
  component: SearchPage,
})

const EMPTY_PAGE = { items: [] as PublicUser[], pagination: { page: 1, limit: 10, total: 0, totalPages: 1 } }

function SearchPage() {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query.trim(), 350)

  const { items, pagination, isLoading, isLoadingMore, error, loadMore, refetch } = usePaginatedList<PublicUser>(
    (page) =>
      debouncedQuery.length > 0 ? searchUsers(debouncedQuery, { page, limit: 10 }) : Promise.resolve(EMPTY_PAGE),
    [debouncedQuery],
  )

  return (
    <AppShell>
      <div className="border-b border-border px-4 py-4 sm:px-6">
        <h1 className="mb-3 text-lg font-bold text-foreground">Search</h1>
        <SearchBar value={query} onChange={setQuery} autoFocus />
      </div>

      {debouncedQuery.length === 0 ? (
        <div className="px-4 py-6 sm:px-6">
          <EmptyState
            icon={<SearchIcon className="h-5 w-5" />}
            title="Find people on Connectly"
            description="Search by name or username to discover accounts."
          />
        </div>
      ) : (
        <UserList
          users={items}
          pagination={pagination}
          isLoading={isLoading}
          isLoadingMore={isLoadingMore}
          error={error}
          onLoadMore={loadMore}
          onRetry={refetch}
          emptyTitle="No results"
          emptyDescription={`We couldn't find anyone matching "${debouncedQuery}".`}
        />
      )}
    </AppShell>
  )
}
