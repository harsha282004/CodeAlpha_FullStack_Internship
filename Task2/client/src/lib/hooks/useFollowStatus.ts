import { useCallback, useEffect, useState } from 'react'
import { getFollowStatus } from '../api/follows'
import { useAuth } from '../auth/AuthContext'
import type { FollowState } from '../api/types'

// Module-level cache + in-flight de-duplication, shared by every mounted
// FollowButton for the lifetime of the page/session. This is what actually
// satisfies "avoid uncontrolled requests": if the same username is rendered
// twice (or a component remounts after already resolving it once), it's
// served from cache instead of re-hitting GET /api/users/:username/follow.
// A batch endpoint was considered and rejected as unnecessary — request
// volume here is already bounded by how many user rows are on screen
// (page size), and the existing single-user endpoint fully covers it.
const statusCache = new Map<string, FollowState>()
const inFlightRequests = new Map<string, Promise<FollowState>>()

function fetchFollowStatus(username: string): Promise<FollowState> {
  const cached = statusCache.get(username)
  if (cached) return Promise.resolve(cached)

  const inFlight = inFlightRequests.get(username)
  if (inFlight) return inFlight

  const request = getFollowStatus(username)
    .then((result) => {
      statusCache.set(username, result)
      return result
    })
    .finally(() => {
      inFlightRequests.delete(username)
    })

  inFlightRequests.set(username, request)
  return request
}

interface UseFollowStatusResult {
  /** null = not yet confirmed (loading, or no authenticated viewer) — never guess "Following". */
  following: boolean | null
  followerCount: number | null
  followingCount: number | null
  /** True only while an authenticated confirmation request is actually in flight. */
  isLoading: boolean
  /** Call after a successful follow/unfollow mutation to sync the shared cache. */
  setConfirmedStatus: (state: FollowState) => void
}

export function useFollowStatus(username: string | null): UseFollowStatusResult {
  const { status: authStatus } = useAuth()
  const isAuthenticated = authStatus === 'authenticated'

  const [state, setState] = useState<FollowState | null>(() =>
    username ? (statusCache.get(username) ?? null) : null,
  )
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!username || !isAuthenticated) {
      setState(null)
      setIsLoading(false)
      return
    }

    const cached = statusCache.get(username)
    if (cached) {
      setState(cached)
      setIsLoading(false)
      return
    }

    let cancelled = false
    setIsLoading(true)

    fetchFollowStatus(username)
      .then((result) => {
        if (!cancelled) setState(result)
      })
      .catch(() => {
        // Leave state as null (unknown) — the button shows a neutral loading
        // treatment rather than guessing, and a click will still work since
        // follow/unfollow are idempotent on the backend regardless.
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [username, isAuthenticated])

  const setConfirmedStatus = useCallback(
    (next: FollowState) => {
      if (username) statusCache.set(username, next)
      setState(next)
    },
    [username],
  )

  return {
    following: state?.following ?? null,
    followerCount: state?.followerCount ?? null,
    followingCount: state?.followingCount ?? null,
    isLoading,
    setConfirmedStatus,
  }
}
