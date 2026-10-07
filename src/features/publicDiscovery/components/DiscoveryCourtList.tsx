import { useState } from 'react'
import { CalendarDays, Clock3, MapPin } from 'lucide-react'
import { AppButton } from '../../../shared/components/AppButton/AppButton'
import { AppCard } from '../../../shared/components/AppCard/AppCard'
import { formatArabicDateWithWeekday } from '../../../shared/utils/date'
import { formatTime12Hour } from '../../schedule/scheduleBoard.helpers'
import { usePublicCourtDiscovery } from '../hooks/usePublicCourtDiscovery'
import { courtDiscoveryCopy } from '../publicDiscovery.copy'
import {
  MAX_DISCOVERY_SELECTED_TIMES,
  type DiscoveryCourtOption,
  type PublicCourtSearchCriteria,
} from '../publicDiscovery.types'
import { DiscoveryCourtCard } from './DiscoveryCourtCard'
import { DiscoveryCourtFilterSheet } from './DiscoveryCourtFilterSheet'
import {
  DiscoveryFilterSheet,
  type DiscoveryFilterSheetMode,
} from './DiscoveryFilterSheet'
import { DiscoveryMatchedCourtCard } from './DiscoveryMatchedCourtCard'

export interface DiscoveryCourtListProps {
  /** Id of the heading that names this list. */
  labelledBy: string
}

const browseGridClassName = 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3'
const matchedGridClassName = 'grid gap-4 lg:grid-cols-2'

function formatSelectedTimesLabel(times: readonly string[]): string {
  if (times.length === 0) {
    return courtDiscoveryCopy.chooseTimes
  }

  return times.map((time) => formatTime12Hour(time)).join(' • ')
}

function getFilteredEmptyMessage(
  activeSearch: PublicCourtSearchCriteria | null,
  isTimeFilteredSearch: boolean,
): string {
  if (!activeSearch) {
    return courtDiscoveryCopy.empty
  }

  const hasCourtFilter = activeSearch.courtId != null

  if (isTimeFilteredSearch) {
    return hasCourtFilter
      ? courtDiscoveryCopy.emptyCourtDayAndTimes
      : courtDiscoveryCopy.emptyDayAndTimes
  }

  if (activeSearch.date) {
    return hasCourtFilter
      ? courtDiscoveryCopy.emptyCourtDayOnly
      : courtDiscoveryCopy.emptyDayOnly
  }

  return courtDiscoveryCopy.empty
}

/**
 * Public Court discovery list with Phase 2/3/4/5 optional Court, Day, and up to
 * 5 Times filters, matching requested times display, and loading, error, empty,
 * and paged states.
 *
 * - Default browsing (`selectedCourt === null`, `selectedDate === null`, and
 *   `activeSearch === null`) preserves the Phase 1 unfiltered Court list
 *   (`DiscoveryCourtCard`).
 * - Searches without requested times (`Court-only`, `Day-only`, and `Court + Day`)
 *   render the simple Phase 1 `DiscoveryCourtCard` without `المواعيد المتاحة`.
 * - Searches with requested times (`Day + Times` and `Court + Day + Times`)
 *   render `DiscoveryMatchedCourtCard`, showing each Court's `matchingTimes`
 *   returned by Backend.
 * - There is no Search button: every Court, day, or time change (including
 *   each selector's `مسح الاختيار`) immediately sends a new Backend request.
 *   The hook aborts the previous request, so an older response can never
 *   overwrite newer results. Filters are cleared per selector, from each
 *   sheet's sticky `مسح الاختيار`; there is no clear-all action in the bar.
 */
export function DiscoveryCourtList({
  labelledBy,
}: DiscoveryCourtListProps) {
  const {
    status,
    courts,
    hasNextPage,
    isLoadingMore,
    loadMoreFailed,
    activeSearch,
    retry,
    loadMore,
    runSearch,
    clearSearch,
  } = usePublicCourtDiscovery()

  const [selectedCourt, setSelectedCourt] =
    useState<DiscoveryCourtOption | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedTimes, setSelectedTimes] = useState<string[]>([])
  const [sheetMode, setSheetMode] = useState<DiscoveryFilterSheetMode>(null)
  const [isCourtSheetOpen, setIsCourtSheetOpen] = useState(false)

  const isTimeFilteredSearch =
    activeSearch !== null &&
    Boolean(activeSearch.date) &&
    activeSearch.times.length > 0

  const filteredHeadingId = `${labelledBy}-filtered-results`
  const activeListLabelledBy =
    activeSearch !== null ? filteredHeadingId : labelledBy

  const filteredHeadingText =
    activeSearch !== null
      ? isTimeFilteredSearch
        ? courtDiscoveryCopy.matchingTimesHeading
        : activeSearch.date
          ? courtDiscoveryCopy.availableDayHeading
          : courtDiscoveryCopy.selectedCourtHeading
      : null

  const emptyMessage = getFilteredEmptyMessage(
    activeSearch,
    isTimeFilteredSearch,
  )

  function handleOpenCourtPicker(): void {
    setIsCourtSheetOpen(true)
  }

  function handleOpenDayPicker(): void {
    setSheetMode('day')
  }

  function handleOpenTimesPicker(): void {
    if (!selectedDate) {
      setSheetMode('day-then-times')
      return
    }

    setSheetMode('times')
  }

  /**
   * Applies a selection immediately: a Backend search while a Court or day is
   * selected, otherwise the default Phase 1 browse. Times only travel with
   * their day, so stale times from another date are never sent.
   */
  function applyFilters(
    court: DiscoveryCourtOption | null,
    date: string | null,
    times: readonly string[],
  ): void {
    if (court === null && date === null) {
      clearSearch()
      return
    }

    runSearch({
      date,
      times: date ? [...times] : [],
      ...(court ? { courtId: court.courtId } : {}),
    })
  }

  function handleSelectCourt(nextCourt: DiscoveryCourtOption): void {
    if (selectedCourt?.key === nextCourt.key) {
      return
    }

    setSelectedCourt(nextCourt)
    applyFilters(nextCourt, selectedDate, selectedTimes)
  }

  function handleClearCourt(): void {
    if (selectedCourt === null) {
      return
    }

    setSelectedCourt(null)
    applyFilters(null, selectedDate, selectedTimes)
  }

  function handleSelectDate(nextDate: string): void {
    if (selectedDate === nextDate) {
      return
    }

    setSelectedDate(nextDate)
    setSelectedTimes([])
    applyFilters(selectedCourt, nextDate, [])
  }

  function handleClearDate(): void {
    if (selectedDate === null) {
      return
    }

    setSelectedDate(null)
    setSelectedTimes([])
    applyFilters(selectedCourt, null, [])
  }

  function handleToggleTime(time: string): void {
    let nextTimes: string[]

    if (selectedTimes.includes(time)) {
      nextTimes = selectedTimes.filter((item) => item !== time)
    } else if (selectedTimes.length >= MAX_DISCOVERY_SELECTED_TIMES) {
      return
    } else {
      nextTimes = [...selectedTimes, time].sort()
    }

    setSelectedTimes(nextTimes)
    applyFilters(selectedCourt, selectedDate, nextTimes)
  }

  function handleClearTimes(): void {
    if (selectedTimes.length === 0) {
      return
    }

    setSelectedTimes([])
    applyFilters(selectedCourt, selectedDate, [])
  }

  return (
    <div className="space-y-4">
      {/* Compact Phase 2/3/4/5 Filter Bar */}
      <div
        aria-label={courtDiscoveryCopy.filterGroupAriaLabel}
        className="flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--sloty-border)] bg-[var(--sloty-surface)] p-2.5 shadow-sm sm:p-3"
        data-testid="discovery-filter-bar"
        role="group"
      >
        <button
          aria-label={
            selectedCourt
              ? `${courtDiscoveryCopy.chooseCourt}: ${selectedCourt.courtName}`
              : courtDiscoveryCopy.chooseCourt
          }
          className={[
            'inline-flex max-w-full min-h-11 items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sloty-primary)]/30',
            selectedCourt
              ? 'border-[var(--sloty-primary)] bg-[var(--sloty-soft-mint)] text-[var(--sloty-primary-dark)]'
              : 'border-[var(--sloty-border)] bg-[var(--sloty-bg)] text-[var(--sloty-text-primary)] hover:border-[var(--sloty-primary)]/50 hover:bg-[var(--sloty-soft-mint)]/60',
          ].join(' ')}
          data-testid="discovery-court-trigger"
          onClick={handleOpenCourtPicker}
          type="button"
        >
          <MapPin
            aria-hidden="true"
            className="h-4 w-4 shrink-0 text-[var(--sloty-primary)]"
          />
          <span className="max-w-[160px] truncate sm:max-w-[220px]">
            {selectedCourt
              ? selectedCourt.courtName
              : courtDiscoveryCopy.chooseCourt}
          </span>
        </button>

        <button
          aria-label={
            selectedDate
              ? `${courtDiscoveryCopy.chooseDay}: ${formatArabicDateWithWeekday(selectedDate)}`
              : courtDiscoveryCopy.chooseDay
          }
          className={[
            'inline-flex max-w-full min-h-11 items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sloty-primary)]/30',
            selectedDate
              ? 'border-[var(--sloty-primary)] bg-[var(--sloty-soft-mint)] text-[var(--sloty-primary-dark)]'
              : 'border-[var(--sloty-border)] bg-[var(--sloty-bg)] text-[var(--sloty-text-primary)] hover:border-[var(--sloty-primary)]/50 hover:bg-[var(--sloty-soft-mint)]/60',
          ].join(' ')}
          data-testid="discovery-day-trigger"
          onClick={handleOpenDayPicker}
          type="button"
        >
          <CalendarDays
            aria-hidden="true"
            className="h-4 w-4 shrink-0 text-[var(--sloty-primary)]"
          />
          <span className="truncate">
            {selectedDate
              ? formatArabicDateWithWeekday(selectedDate)
              : courtDiscoveryCopy.chooseDay}
          </span>
        </button>

        <button
          aria-label={
            selectedTimes.length > 0
              ? `${courtDiscoveryCopy.chooseTimes}: ${formatSelectedTimesLabel(selectedTimes)}`
              : courtDiscoveryCopy.chooseTimes
          }
          className={[
            'inline-flex max-w-full min-h-11 items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sloty-primary)]/30',
            selectedTimes.length > 0
              ? 'border-[var(--sloty-primary)] bg-[var(--sloty-soft-mint)] text-[var(--sloty-primary-dark)]'
              : 'border-[var(--sloty-border)] bg-[var(--sloty-bg)] text-[var(--sloty-text-primary)] hover:border-[var(--sloty-primary)]/50 hover:bg-[var(--sloty-soft-mint)]/60',
          ].join(' ')}
          data-testid="discovery-times-trigger"
          onClick={handleOpenTimesPicker}
          type="button"
        >
          <Clock3
            aria-hidden="true"
            className="h-4 w-4 shrink-0 text-[var(--sloty-primary)]"
          />
          <span
            className="max-w-[200px] truncate sm:max-w-[280px]"
            dir={selectedTimes.length > 0 ? 'ltr' : undefined}
          >
            {formatSelectedTimesLabel(selectedTimes)}
          </span>
        </button>

      </div>

      {/* Filtered Results Heading */}
      {filteredHeadingText ? (
        <h3
          className="text-base font-black text-[var(--sloty-text-primary)]"
          id={filteredHeadingId}
        >
          {filteredHeadingText}
        </h3>
      ) : null}

      {/* Results Area */}
      {status === 'loading' ? (
        <AppCard aria-busy="true">
          <p className="text-sm text-[var(--sloty-text-muted)]" role="status">
            {courtDiscoveryCopy.loading}
          </p>
        </AppCard>
      ) : status === 'error' ? (
        <AppCard className="flex flex-col gap-3" role="alert">
          <p className="text-sm font-semibold text-[var(--sloty-danger)]">
            {courtDiscoveryCopy.error}
          </p>
          <AppButton className="sm:w-fit" onClick={retry}>
            {courtDiscoveryCopy.retry}
          </AppButton>
        </AppCard>
      ) : courts.length === 0 ? (
        <AppCard>
          <p className="text-sm text-[var(--sloty-text-muted)]">
            {emptyMessage}
          </p>
        </AppCard>
      ) : (
        <div className="space-y-4">
          <ul
            aria-labelledby={activeListLabelledBy}
            className={
              isTimeFilteredSearch ? matchedGridClassName : browseGridClassName
            }
          >
            {courts.map((court) => (
              <li key={court.key}>
                {isTimeFilteredSearch ? (
                  <DiscoveryMatchedCourtCard
                    court={court}
                    handoffDate={activeSearch?.date ?? null}
                  />
                ) : (
                  <DiscoveryCourtCard
                    court={court}
                    handoffDate={activeSearch?.date ?? null}
                  />
                )}
              </li>
            ))}
          </ul>
          {hasNextPage ? (
            <div className="flex flex-col items-center gap-2">
              {loadMoreFailed ? (
                <p className="text-sm font-bold text-[var(--sloty-danger)]" role="alert">
                  {courtDiscoveryCopy.loadMoreError}
                </p>
              ) : null}
              <AppButton disabled={isLoadingMore} onClick={loadMore} variant="secondary">
                {isLoadingMore
                  ? courtDiscoveryCopy.loadingMore
                  : courtDiscoveryCopy.loadMore}
              </AppButton>
            </div>
          ) : null}
        </div>
      )}

      <DiscoveryCourtFilterSheet
        isOpen={isCourtSheetOpen}
        onClearCourt={handleClearCourt}
        onClose={() => setIsCourtSheetOpen(false)}
        onSelectCourt={handleSelectCourt}
        selectedCourt={selectedCourt}
      />

      <DiscoveryFilterSheet
        mode={sheetMode}
        onClearDate={handleClearDate}
        onClearTimes={handleClearTimes}
        onClose={() => setSheetMode(null)}
        onSelectDate={handleSelectDate}
        onSwitchMode={setSheetMode}
        onToggleTime={handleToggleTime}
        selectedDate={selectedDate}
        selectedTimes={selectedTimes}
      />
    </div>
  )
}
