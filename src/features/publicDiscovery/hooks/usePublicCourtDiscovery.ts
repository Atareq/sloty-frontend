import { useCallback, useEffect, useRef, useState } from 'react'
import { listPublicCourts, searchPublicCourts } from '../publicDiscoveryApi'
import type {
  DiscoveryCourt,
  PublicCourtSearchCriteria,
} from '../publicDiscovery.types'

export type PublicCourtDiscoveryStatus = 'loading' | 'error' | 'ready'

export interface PublicCourtDiscoveryState {
  status: PublicCourtDiscoveryStatus
  courts: DiscoveryCourt[]
  hasNextPage: boolean
  isLoadingMore: boolean
  loadMoreFailed: boolean
  /** Active Phase 2/3/4 search criteria, or `null` when browsing all Courts. */
  activeSearch: PublicCourtSearchCriteria | null
  /** Reloads the first page of the current browse or filtered search. */
  retry: () => void
  /** Appends the next Backend page for the current browse or filtered search. */
  loadMore: () => void
  /** Executes a Phase 2/3/4 filtered search (`GET public/courts/search/`). */
  runSearch: (criteria: PublicCourtSearchCriteria) => void
  /** Clears any active search and restores the unfiltered Courts list. */
  clearSearch: () => void
}

interface DiscoveryQueryRequest {
  criteria: PublicCourtSearchCriteria | null
  key: number
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

/** Appends a page while keeping the first occurrence of every Court. */
function mergeCourts(
  current: DiscoveryCourt[],
  next: DiscoveryCourt[],
): DiscoveryCourt[] {
  const seen = new Set(current.map((court) => court.key))

  return [...current, ...next.filter((court) => !seen.has(court.key))]
}

/**
 * Loads real public Courts from the discovery API (`GET public/courts/`) or
 * from the Phase 2/3/4 filtered search API (`GET public/courts/search/`).
 *
 * - Default mount (`activeSearch === null`) loads page 1 of `listPublicCourts`.
 * - Calling `runSearch(criteria)` loads page 1 of `searchPublicCourts`.
 * - Calling `clearSearch()` resets `activeSearch` to `null` and reloads page 1
 *   of `listPublicCourts`.
 * - `loadMore` appends the next DRF page using the same endpoint and active
 *   criteria (including `courtId` when filtering by a specific Court).
 * - Requests abort on unmount or when a new query starts, so a stale response
 *   never overwrites newer results. This matters because discovery filters
 *   search on every change (there is no Search button).
 */
export function usePublicCourtDiscovery(): PublicCourtDiscoveryState {
  const [status, setStatus] = useState<PublicCourtDiscoveryStatus>('loading')
  const [courts, setCourts] = useState<DiscoveryCourt[]>([])
  const [page, setPage] = useState(1)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [loadMoreFailed, setLoadMoreFailed] = useState(false)
  const [query, setQuery] = useState<DiscoveryQueryRequest>({
    criteria: null,
    key: 0,
  })
  const loadMoreControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    const activeCriteria = query.criteria

    async function loadFirstPage(): Promise<void> {
      loadMoreControllerRef.current?.abort()
      setStatus('loading')
      setIsLoadingMore(false)
      setLoadMoreFailed(false)

      try {
        const result = activeCriteria
          ? await searchPublicCourts(
              {
                date: activeCriteria.date,
                times: activeCriteria.times,
                ...(activeCriteria.courtId != null
                  ? { courtId: activeCriteria.courtId }
                  : {}),
                page: 1,
              },
              { signal: controller.signal },
            )
          : await listPublicCourts(
              { page: 1 },
              { signal: controller.signal },
            )

        if (controller.signal.aborted) {
          return
        }

        setCourts(result.courts)
        setPage(1)
        setHasNextPage(result.hasNextPage)
        setStatus('ready')
      } catch (error) {
        if (controller.signal.aborted || isAbortError(error)) {
          return
        }

        setCourts([])
        setHasNextPage(false)
        setStatus('error')
      }
    }

    void loadFirstPage()

    return () => {
      controller.abort()
      loadMoreControllerRef.current?.abort()
    }
  }, [query])

  // Each new query switches to `loading` in the same render, so results from
  // the previous criteria are never shown under the new ones.
  const retry = useCallback(() => {
    setStatus('loading')
    setQuery((current) => ({
      criteria: current.criteria,
      key: current.key + 1,
    }))
  }, [])

  const runSearch = useCallback((criteria: PublicCourtSearchCriteria) => {
    setStatus('loading')
    setQuery((current) => ({
      criteria: {
        date: criteria.date,
        times: [...criteria.times],
        ...(criteria.courtId != null ? { courtId: criteria.courtId } : {}),
      },
      key: current.key + 1,
    }))
  }, [])

  const clearSearch = useCallback(() => {
    setStatus('loading')
    setQuery((current) => ({
      criteria: null,
      key: current.key + 1,
    }))
  }, [])

  const loadMore = useCallback(() => {
    if (status !== 'ready' || !hasNextPage || isLoadingMore) {
      return
    }

    const controller = new AbortController()
    const nextPage = page + 1
    const activeCriteria = query.criteria
    loadMoreControllerRef.current = controller
    setIsLoadingMore(true)
    setLoadMoreFailed(false)

    const requestPromise = activeCriteria
      ? searchPublicCourts(
          {
            date: activeCriteria.date,
            times: activeCriteria.times,
            ...(activeCriteria.courtId != null
              ? { courtId: activeCriteria.courtId }
              : {}),
            page: nextPage,
          },
          { signal: controller.signal },
        )
      : listPublicCourts(
          { page: nextPage },
          { signal: controller.signal },
        )

    requestPromise
      .then((result) => {
        if (controller.signal.aborted) {
          return
        }

        setCourts((current) => mergeCourts(current, result.courts))
        setPage(nextPage)
        setHasNextPage(result.hasNextPage)
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || isAbortError(error)) {
          return
        }

        setLoadMoreFailed(true)
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoadingMore(false)
        }
      })
  }, [hasNextPage, isLoadingMore, page, query.criteria, status])

  return {
    status,
    courts,
    hasNextPage,
    isLoadingMore,
    loadMoreFailed,
    activeSearch: query.criteria,
    retry,
    loadMore,
    runSearch,
    clearSearch,
  }
}
