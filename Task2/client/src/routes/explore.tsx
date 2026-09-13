import { createFileRoute } from '@tanstack/react-router'
import { Compass } from 'lucide-react'
import { AppShell } from '../components/layout/AppShell'
import { PostList } from '../components/post/PostList'
import { DiscoverPeoplePanel } from '../components/profile/DiscoverPeoplePanel'
import { usePaginatedList } from '../lib/hooks/usePaginatedList'
import { getExplore } from '../lib/api/feed'
import type { FeedPost, Post } from '../lib/api/types'

export const Route = createFileRoute('/explore')({
  component: ExplorePage,
})

function ExplorePage() {
  const { items, pagination, isLoading, isLoadingMore, error, loadMore, removeItem, updateItem, refetch } =
    usePaginatedList<FeedPost>((page) => getExplore({ page, limit: 10 }), [])

  function handleDeleted(postId: string) {
    removeItem((post) => post.id === postId)
  }

  function handleUpdated(updated: Post) {
    updateItem(
      (post) => post.id === updated.id,
      (post) => ({ ...post, ...updated }),
    )
  }

  return (
    <AppShell rightPanel={<DiscoverPeoplePanel />}>
      <div className="border-b border-border px-4 py-4 sm:px-6">
        <div className="flex items-center gap-2">
          <Compass className="h-5 w-5 text-accent" aria-hidden="true" />
          <h1 className="text-lg font-bold text-foreground">Explore</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Public posts from across Connectly.</p>
      </div>
      <PostList
        posts={items}
        pagination={pagination}
        isLoading={isLoading}
        isLoadingMore={isLoadingMore}
        error={error}
        onLoadMore={loadMore}
        onRetry={refetch}
        onDeleted={handleDeleted}
        onUpdated={handleUpdated}
        emptyTitle="Nothing to explore yet"
        emptyDescription="Once people start posting, their public posts will show up here."
      />
    </AppShell>
  )
}
