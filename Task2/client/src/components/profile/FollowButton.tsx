import { useState } from 'react'
import { Button } from '../ui/Button'
import { Skeleton } from '../ui/Skeleton'
import { followUser, unfollowUser } from '../../lib/api/follows'
import { ApiError } from '../../lib/api/client'
import { useAuth } from '../../lib/auth/AuthContext'
import { useToast } from '../../lib/toast/ToastContext'
import { useFollowStatus } from '../../lib/hooks/useFollowStatus'

interface FollowButtonProps {
  username: string
  size?: 'sm' | 'md'
  onChange?: (following: boolean) => void
}

const SKELETON_SIZE: Record<NonNullable<FollowButtonProps['size']>, string> = {
  sm: 'h-9 w-[6.5rem] rounded-full',
  md: 'h-11 w-28 rounded-full',
}

export function FollowButton({ username, size = 'sm', onChange }: FollowButtonProps) {
  const { user, status: authStatus } = useAuth()
  const { showToast } = useToast()
  const isSelf = user?.username === username
  // Pass null for your own profile so the hook skips fetching entirely —
  // self-follow is never possible, so there's nothing to confirm.
  const { following, followerCount, followingCount, isLoading, setConfirmedStatus } = useFollowStatus(
    isSelf ? null : username,
  )
  const [isMutating, setIsMutating] = useState(false)

  // A user can never follow themselves — never render the control for that case.
  if (isSelf) return null

  // Confirmed status is still resolving for a signed-in viewer — show a
  // neutral loading treatment rather than guessing "Follow" or "Following".
  if (authStatus === 'authenticated' && isLoading) {
    return <Skeleton className={SKELETON_SIZE[size]} />
  }

  // Guests never trigger the authenticated status check, so `following` stays
  // null for them — default to the "Follow" appearance; clicking prompts login.
  const isFollowing = following ?? false

  async function handleClick() {
    if (authStatus !== 'authenticated') {
      showToast({ message: 'Log in to follow people.' })
      return
    }
    // Guards against a rapid double-click creating a race between two
    // in-flight mutations for the same button.
    if (isMutating) return

    const previous: boolean = following ?? false
    const previousCounts = { followerCount: followerCount ?? 0, followingCount: followingCount ?? 0 }
    const optimisticNext = !previous

    setConfirmedStatus({
      following: optimisticNext,
      followerCount: previousCounts.followerCount + (optimisticNext ? 1 : -1),
      followingCount: previousCounts.followingCount,
    })
    setIsMutating(true)

    try {
      const result = previous ? await unfollowUser(username) : await followUser(username)
      setConfirmedStatus(result)
      onChange?.(result.following)
      if (!previous && result.following) {
        showToast({ tone: 'success', message: `You're now following @${username}.` })
      }
    } catch (error) {
      // Roll back to the last confirmed state — never leave the UI claiming
      // a mutation succeeded when the backend rejected it.
      setConfirmedStatus({ following: previous, ...previousCounts })
      showToast({
        tone: 'destructive',
        message: error instanceof ApiError ? error.message : 'Could not update follow status.',
      })
    } finally {
      setIsMutating(false)
    }
  }

  return (
    <Button
      type="button"
      variant={isFollowing ? 'outline' : 'primary'}
      size={size}
      onClick={handleClick}
      isLoading={isMutating}
      aria-busy={isMutating}
    >
      {isFollowing ? 'Following' : 'Follow'}
    </Button>
  )
}
