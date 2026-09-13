import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { UserX } from 'lucide-react'
import { AppShell } from '../components/layout/AppShell'
import { ProfileHeader } from '../components/profile/ProfileHeader'
import { PostList } from '../components/post/PostList'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { Skeleton } from '../components/ui/Skeleton'
import { useAsync } from '../lib/hooks/useAsync'
import { usePaginatedList } from '../lib/hooks/usePaginatedList'
import { getPublicProfile } from '../lib/api/users'
import { listPosts } from '../lib/api/posts'
import { listFollowers, listFollowing } from '../lib/api/follows'
import { useAuth } from '../lib/auth/AuthContext'
import type { Post } from '../lib/api/types'

export const Route = createFileRoute('/profile/$username')({
  component: ProfilePage,
})

function ProfilePage() {
  const { username } = Route.useParams()
  const { user } = useAuth()
  const isOwnProfile = user?.username === username

  const {
    data: profileData,
    error: profileError,
    errorStatus: profileErrorStatus,
    isLoading: isProfileLoading,
    refetch: refetchProfile,
  } = useAsync(() => getPublicProfile(username), [username])

  const [followerCount, setFollowerCount] = useState<number | null>(null)
  const [followingCount, setFollowingCount] = useState<number | null>(null)

  // One-time, bounded lookups per profile view (not per list item). These
  // stay on the public followers/following endpoints — rather than the
  // authenticated follow-status endpoint — specifically so guests see
  // accurate counts too. Whether *this viewer* follows the profile is now
  // resolved by FollowButton itself via useFollowStatus (shared cache).
  useEffect(() => {
    if (!profileData) return
    let cancelled = false

    listFollowers(username, { page: 1, limit: 1 })
      .then((result) => {
        if (!cancelled) setFollowerCount(result.pagination.total)
      })
      .catch(() => {
        if (!cancelled) setFollowerCount(0)
      })

    listFollowing(username, { page: 1, limit: 1 })
      .then((result) => {
        if (!cancelled) setFollowingCount(result.pagination.total)
      })
      .catch(() => {
        if (!cancelled) setFollowingCount(0)
      })

    return () => {
      cancelled = true
    }
  }, [profileData, username])

  const {
    items: posts,
    pagination,
    isLoading: postsLoading,
    isLoadingMore,
    error: postsError,
    loadMore,
    removeItem,
    updateItem,
    refetch: refetchPosts,
  } = usePaginatedList<Post>((page) => listPosts({ username, page, limit: 10 }), [username])

  function handleDeleted(postId: string) {
    removeItem((post) => post.id === postId)
  }

  function handleUpdated(updated: Post) {
    updateItem(
      (post) => post.id === updated.id,
      (post) => ({ ...post, ...updated }),
    )
  }

  if (isProfileLoading) {
    return (
      <AppShell>
        <div className="border-b border-border p-6">
          <Skeleton className="h-28 w-full rounded-xl sm:h-36" />
          <div className="-mt-8 flex items-end">
            <Skeleton className="h-24 w-24 rounded-full ring-4 ring-background" />
          </div>
          <div className="mt-4 space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>
      </AppShell>
    )
  }

  if (profileError || !profileData) {
    return (
      <AppShell>
        <div className="px-4 py-10 sm:px-6">
          {profileErrorStatus === 404 ? (
            <EmptyState
              icon={<UserX className="h-5 w-5" />}
              title="User not found"
              description={`@${username} doesn't exist on Connectly.`}
            />
          ) : (
            <ErrorState message={profileError ?? undefined} onRetry={refetchProfile} />
          )}
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <ProfileHeader
        profileUser={profileData.user}
        isOwnProfile={isOwnProfile}
        followerCount={followerCount}
        followingCount={followingCount}
      />
      <PostList
        posts={posts}
        pagination={pagination}
        isLoading={postsLoading}
        isLoadingMore={isLoadingMore}
        error={postsError}
        onLoadMore={loadMore}
        onRetry={refetchPosts}
        onDeleted={handleDeleted}
        onUpdated={handleUpdated}
        emptyTitle={isOwnProfile ? "You haven't posted yet" : 'No posts yet'}
        emptyDescription={
          isOwnProfile ? 'Share your first post from the Home feed.' : `@${username} hasn't posted anything yet.`
        }
      />
    </AppShell>
  )
}
