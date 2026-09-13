import { createFileRoute } from '@tanstack/react-router'
import { AppShell } from '../components/layout/AppShell'
import { RequireAuth } from '../lib/auth/RequireAuth'
import { PostComposer } from '../components/post/PostComposer'
import { PostList } from '../components/post/PostList'
import { DiscoverPeoplePanel } from '../components/profile/DiscoverPeoplePanel'
import { usePaginatedList } from '../lib/hooks/usePaginatedList'
import { getFeed } from '../lib/api/feed'
import type { FeedPost, Post } from '../lib/api/types'

export const Route = createFileRoute('/feed')({
  component: FeedRoute,
})

function FeedRoute() {
  return (
    <RequireAuth>
      <FeedPage />
    </RequireAuth>
  )
}

function FeedPage() {
  const { items, pagination, isLoading, isLoadingMore, error, loadMore, removeItem, setItems, updateItem, refetch } =
    usePaginatedList<FeedPost>((page) => getFeed({ page, limit: 10 }), [])

  function handleCreated(post: Post) {
    setItems((current) => [{ ...post, likedByMe: false }, ...current])
  }

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
      <div className="sticky top-14 z-10 border-b border-border bg-background/90 px-4 py-3 backdrop-blur sm:top-0 sm:px-6">
        <h1 className="text-lg font-bold text-foreground">Home</h1>
      </div>
      <PostComposer onCreated={handleCreated} />
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
        emptyTitle="Your feed is quiet"
        emptyDescription="Follow people or share your first post to get things moving."
      />
    </AppShell>
  )
}
