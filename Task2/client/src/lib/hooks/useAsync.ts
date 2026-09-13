import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react'
import { ApiError } from '../api/client'

interface AsyncState<T> {
  data: T | null
  error: string | null
  /** HTTP status of the failure, when known — lets a caller special-case e.g. 404. */
  errorStatus: number | null
  isLoading: boolean
}

export interface AsyncResult<T> extends AsyncState<T> {
  refetch: () => void
}

/**
 * Shared data-fetching pattern for GET-driven pages/components: tracks
 * loading/error/data, re-runs when `deps` change, ignores results from a
 * stale request if deps change again mid-flight, and exposes `refetch` for
 * manual re-runs (e.g. after a mutation elsewhere).
 */
export function useAsync<T>(fetcher: () => Promise<T>, deps: DependencyList): AsyncResult<T> {
  const [state, setState] = useState<AsyncState<T>>({ data: null, error: null, errorStatus: null, isLoading: true })
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(
    () => {
      let cancelled = false
      setState((previous) => ({ data: previous.data, error: null, errorStatus: null, isLoading: true }))

      fetcherRef
        .current()
        .then((data) => {
          if (!cancelled) setState({ data, error: null, errorStatus: null, isLoading: false })
        })
        .catch((error: unknown) => {
          if (cancelled) return
          const message = error instanceof ApiError ? error.message : 'Something went wrong. Please try again.'
          const status = error instanceof ApiError ? error.status : null
          setState({ data: null, error: message, errorStatus: status, isLoading: false })
        })

      return () => {
        cancelled = true
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [...deps, reloadToken],
  )

  const refetch = useCallback(() => setReloadToken((token) => token + 1), [])

  return { ...state, refetch }
}
