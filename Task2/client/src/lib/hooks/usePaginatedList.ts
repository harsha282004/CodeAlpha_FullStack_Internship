import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react'
import { ApiError } from '../api/client'
import type { Pagination } from '../api/types'

interface PageFetcher<T> {
  (page: number): Promise<{ items: T[]; pagination: Pagination }>
}

/**
 * "Load more"-style pagination: fetches page 1 whenever `deps` changes,
 * appends subsequent pages on demand. Used by every paginated list in the
 * app (feed, explore, search, followers/following, comments) so they share
 * one loading/error/append implementation instead of five bespoke ones.
 */
export function usePaginatedList<T>(fetchPage: PageFetcher<T>, deps: DependencyList) {
  const [items, setItems] = useState<T[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPageRef = useRef(fetchPage)
  fetchPageRef.current = fetchPage
  const paginationRef = useRef<Pagination | null>(null)
  paginationRef.current = pagination
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)
    setItems([])
    setPagination(null)

    fetchPageRef
      .current(1)
      .then((result) => {
        if (cancelled) return
        setItems(result.items)
        setPagination(result.pagination)
        setIsLoading(false)
      })
      .catch((caught: unknown) => {
        if (cancelled) return
        setError(caught instanceof ApiError ? caught.message : 'Something went wrong. Please try again.')
        setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadToken])

  const refetch = useCallback(() => setReloadToken((token) => token + 1), [])

  const loadMore = useCallback(async () => {
    const current = paginationRef.current
    if (!current || current.page >= current.totalPages || isLoadingMore) return

    setIsLoadingMore(true)
    try {
      const result = await fetchPageRef.current(current.page + 1)
      setItems((previous) => [...previous, ...result.items])
      setPagination(result.pagination)
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Something went wrong. Please try again.')
    } finally {
      setIsLoadingMore(false)
    }
  }, [isLoadingMore])

  const removeItem = useCallback((predicate: (item: T) => boolean) => {
    setItems((previous) => previous.filter((item) => !predicate(item)))
  }, [])

  const updateItem = useCallback((predicate: (item: T) => boolean, updater: (item: T) => T) => {
    setItems((previous) => previous.map((item) => (predicate(item) ? updater(item) : item)))
  }, [])

  const hasMore = Boolean(pagination && pagination.page < pagination.totalPages)

  return {
    items,
    pagination,
    isLoading,
    isLoadingMore,
    error,
    loadMore,
    hasMore,
    removeItem,
    updateItem,
    setItems,
    refetch,
  }
}
