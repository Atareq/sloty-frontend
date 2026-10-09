import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Check } from 'lucide-react'
import { AppButton } from '../../../shared/components/AppButton/AppButton'
import { AppSheet } from '../../../shared/components/AppSheet/AppSheet'
import { mapDiscoveryCourtPageToOptionPage } from '../publicDiscovery.mappers'
import { courtDiscoveryCopy } from '../publicDiscovery.copy'
import { listPublicCourts } from '../publicDiscoveryApi'
import type { DiscoveryCourtOption } from '../publicDiscovery.types'
import { DiscoveryClearSelectionButton } from './DiscoveryClearSelectionButton'

export interface DiscoveryCourtFilterSheetProps {
  isOpen: boolean
  selectedCourt: DiscoveryCourtOption | null
  onSelectCourt: (court: DiscoveryCourtOption) => void
  /** Clears the selected Court; the sheet stays open. */
  onClearCourt: () => void
  onClose: () => void
}

type CourtOptionsStatus = 'loading' | 'error' | 'ready'

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

function normalizeCourtNameKey(name: string): string {
  return name.trim().toLowerCase()
}

function mergeCourtOptions(
  current: DiscoveryCourtOption[],
  next: DiscoveryCourtOption[],
): DiscoveryCourtOption[] {
  const seen = new Set(current.map((option) => option.key))

  return [...current, ...next.filter((option) => !seen.has(option.key))]
}

/**
 * Modal / bottom-sheet for Phase 4 single-Court selection (`اختار ملعب معين`).
 *
 * - Loads real publicly discoverable Courts from `listPublicCourts` (`GET public/courts/`)
 *   with its own loading, error + retry, empty, and paginated "load more" states.
 * - Selects Courts by stable Backend identity (`courtId` + `clubSlug`), never
 *   comparing by display name.
 * - Disambiguates duplicate or generic Court names (e.g. `ملعب 1` across Clubs)
 *   by showing `clubName` as secondary context inside the selector only.
 * - Single-select: Backend search accepts one `court_id`. Picking a Court
 *   replaces the previous one and applies immediately.
 * - Only the options scroll; the sticky footer keeps `مسح الاختيار` visible.
 */
export function DiscoveryCourtFilterSheet({
  isOpen,
  selectedCourt,
  onSelectCourt,
  onClearCourt,
  onClose,
}: DiscoveryCourtFilterSheetProps) {
  const [status, setStatus] = useState<CourtOptionsStatus>('loading')
  const [options, setOptions] = useState<DiscoveryCourtOption[]>([])
  const [page, setPage] = useState(1)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [loadMoreFailed, setLoadMoreFailed] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const loadMoreControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!isOpen) {
      loadMoreControllerRef.current?.abort()
      return
    }

    const controller = new AbortController()

    async function loadFirstOptionsPage(): Promise<void> {
      loadMoreControllerRef.current?.abort()
      setStatus('loading')
      setIsLoadingMore(false)
      setLoadMoreFailed(false)

      try {
        const discoveryPage = await listPublicCourts(
          { page: 1 },
          { signal: controller.signal },
        )

        if (controller.signal.aborted) {
          return
        }

        const optionPage = mapDiscoveryCourtPageToOptionPage(discoveryPage)
        setOptions(optionPage.options)
        setPage(1)
        setHasNextPage(optionPage.hasNextPage)
        setStatus('ready')
      } catch (error) {
        if (controller.signal.aborted || isAbortError(error)) {
          return
        }

        setOptions([])
        setHasNextPage(false)
        setStatus('error')
      }
    }

    void loadFirstOptionsPage()

    return () => {
      controller.abort()
      loadMoreControllerRef.current?.abort()
    }
  }, [isOpen, reloadKey])

  const duplicateNameSet = useMemo(() => {
    const counts = new Map<string, number>()

    for (const option of options) {
      const key = normalizeCourtNameKey(option.courtName)
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }

    const duplicates = new Set<string>()
    for (const [key, count] of counts.entries()) {
      if (count > 1) {
        duplicates.add(key)
      }
    }

    return duplicates
  }, [options])

  const handleRetry = useCallback(() => {
    setReloadKey((current) => current + 1)
  }, [])

  const handleLoadMore = useCallback(() => {
    if (status !== 'ready' || !hasNextPage || isLoadingMore) {
      return
    }

    const controller = new AbortController()
    const nextPage = page + 1
    loadMoreControllerRef.current = controller
    setIsLoadingMore(true)
    setLoadMoreFailed(false)

    listPublicCourts({ page: nextPage }, { signal: controller.signal })
      .then((discoveryPage) => {
        if (controller.signal.aborted) {
          return
        }

        const optionPage = mapDiscoveryCourtPageToOptionPage(discoveryPage)
        setOptions((current) => mergeCourtOptions(current, optionPage.options))
        setPage(nextPage)
        setHasNextPage(optionPage.hasNextPage)
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
  }, [hasNextPage, isLoadingMore, page, status])

  function handlePickCourt(option: DiscoveryCourtOption): void {
    onSelectCourt(option)
    onClose()
  }

  if (!isOpen) {
    return null
  }

  return (
    <AppSheet
      className="md:max-w-md"
      footer={
        <DiscoveryClearSelectionButton
          disabled={selectedCourt === null}
          onClear={onClearCourt}
        />
      }
      isOpen={isOpen}
      onRequestClose={onClose}
      title={courtDiscoveryCopy.chooseCourt}
    >
      <div
        className="space-y-3 p-4 sm:p-5"
        data-testid="discovery-court-filter-sheet"
        dir="rtl"
      >
        {status === 'loading' ? (
          <div
            aria-busy="true"
            className="rounded-2xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] p-4"
          >
            <p className="text-sm text-[var(--sloty-text-muted)]" role="status">
              {courtDiscoveryCopy.loading}
            </p>
          </div>
        ) : status === 'error' ? (
          <div
            className="flex flex-col gap-3 rounded-2xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] p-4"
            role="alert"
          >
            <p className="text-sm font-semibold text-[var(--sloty-danger)]">
              {courtDiscoveryCopy.error}
            </p>
            <AppButton className="sm:w-fit" onClick={handleRetry}>
              {courtDiscoveryCopy.retry}
            </AppButton>
          </div>
        ) : options.length === 0 ? (
          <div className="rounded-2xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] p-4">
            <p className="text-sm text-[var(--sloty-text-muted)]">
              {courtDiscoveryCopy.empty}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <ul
              aria-label={courtDiscoveryCopy.chooseCourt}
              className="space-y-2"
              data-testid="discovery-court-options-list"
            >
              {options.map((option) => {
                const isSelected =
                  selectedCourt !== null &&
                  selectedCourt.courtId === option.courtId &&
                  selectedCourt.clubSlug === option.clubSlug

                const showClubDisambiguation =
                  duplicateNameSet.has(normalizeCourtNameKey(option.courtName)) &&
                  option.clubName.trim().length > 0

                const accessibleName = showClubDisambiguation
                  ? `${option.courtName} - ${option.clubName}`
                  : option.courtName

                return (
                  <li key={option.key}>
                    <button
                      aria-label={accessibleName}
                      aria-pressed={isSelected}
                      className={[
                        'flex min-h-12 w-full cursor-pointer items-center justify-between gap-3 rounded-2xl border px-3.5 py-2.5 text-right transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sloty-primary)]/30',
                        isSelected
                          ? 'border-[var(--sloty-primary)] bg-[var(--sloty-soft-mint)] text-[var(--sloty-primary-dark)] shadow-sm'
                          : 'border-[var(--sloty-border)] bg-[var(--sloty-bg)] text-[var(--sloty-text-primary)] hover:border-[var(--sloty-primary)]/50 hover:bg-[var(--sloty-soft-mint)]/60',
                      ].join(' ')}
                      data-testid={`discovery-court-option-${option.key}`}
                      onClick={() => handlePickCourt(option)}
                      type="button"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black">
                          {option.courtName}
                        </p>
                        {showClubDisambiguation ? (
                          <p
                            className="mt-0.5 truncate text-xs font-bold text-[var(--sloty-text-muted)]"
                            data-testid="discovery-court-option-club-name"
                          >
                            {option.clubName}
                          </p>
                        ) : null}
                      </div>

                      {isSelected ? (
                        <Check
                          aria-hidden="true"
                          className="h-4 w-4 shrink-0 text-[var(--sloty-primary-dark)]"
                        />
                      ) : null}
                    </button>
                  </li>
                )
              })}
            </ul>

            {hasNextPage ? (
              <div className="flex flex-col items-center gap-2 pt-1">
                {loadMoreFailed ? (
                  <p
                    className="text-xs font-bold text-[var(--sloty-danger)]"
                    role="alert"
                  >
                    {courtDiscoveryCopy.loadMoreError}
                  </p>
                ) : null}
                <AppButton
                  data-testid="discovery-court-options-load-more"
                  disabled={isLoadingMore}
                  onClick={handleLoadMore}
                  variant="secondary"
                >
                  {isLoadingMore
                    ? courtDiscoveryCopy.loadingMore
                    : courtDiscoveryCopy.loadMore}
                </AppButton>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </AppSheet>
  )
}
