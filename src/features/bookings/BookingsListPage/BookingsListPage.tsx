import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { getApiErrorMessage } from '../../../core/api/apiError.helpers'
import { useAuth } from '../../../core/auth/useAuth'
import { AppButton } from '../../../shared/components/AppButton/AppButton'
import { AppCard } from '../../../shared/components/AppCard/AppCard'
import { PageHeader } from '../../../shared/components/PageHeader/PageHeader'
import { buildPathWithQuery } from '../../../shared/utils/buildPathWithQuery'
import type { QueryParamValue } from '../../../shared/utils/buildPathWithQuery'
import { formatDateInputValue } from '../../../shared/utils/date'
import { toQueryObject } from '../../../shared/utils/queryParams'
import { listBookings } from '../bookingsApi'
import type {
  Booking,
  BookingsQueryParams,
  BookingStatus,
} from '../bookings.types'
import { bookingStatusLabels } from '../bookings.types'
import {
  BookingFilterChips,
} from '../components/BookingFilterChips/BookingFilterChips'
import {
  type BookingFilterChipKey,
  getActiveBookingFilterChips,
} from '../components/BookingFilterChips/BookingFilterChips.helpers'
import { BookingListCard } from '../components/BookingListCard/BookingListCard'

interface FilterState {
  court: string
  date: string
  date_from: string
  date_to: string
  ended: string
  hold_expiring: string
  needs_action: string
  overdue: string
  remaining_amount_gt: string
  status: BookingStatus | ''
}

const bookingFilterKeys = [
  'court',
  'date',
  'date_from',
  'date_to',
  'ended',
  'hold_expiring',
  'needs_action',
  'overdue',
  'page',
  'remaining_amount_gt',
  'status',
] as const

function createDefaultQueryParams(): BookingsQueryParams {
  return {
    date: formatDateInputValue(new Date()),
  }
}

function isBookingStatus(value: string): value is BookingStatus {
  return Object.keys(bookingStatusLabels).includes(value)
}

function parseBookingsQueryParams(search: string): BookingsQueryParams {
  const queryObject = toQueryObject(search)
  const params: BookingsQueryParams = {}

  bookingFilterKeys.forEach((key) => {
    const value = queryObject[key]

    if (!value) {
      return
    }

    if (key === 'status') {
      params.status = isBookingStatus(value) ? value : ''
      return
    }

    if (
      key === 'ended'
      || key === 'hold_expiring'
      || key === 'needs_action'
      || key === 'overdue'
    ) {
      params[key] = value
      return
    }

    if (key === 'court' || key === 'page' || key === 'remaining_amount_gt') {
      params[key] = value
      return
    }

    if (key === 'date' || key === 'date_from' || key === 'date_to') {
      params[key] = value
    }
  })

  return params
}

function hasBookingFilters(params: BookingsQueryParams): boolean {
  return bookingFilterKeys.some((key) => {
    const value = params[key]

    return value !== undefined && value !== ''
  })
}

function filterStateFromParams(params: BookingsQueryParams): FilterState {
  return {
    court: params.court === undefined ? '' : String(params.court),
    date: params.date ?? '',
    date_from: params.date_from ?? '',
    date_to: params.date_to ?? '',
    ended: params.ended === undefined ? '' : String(params.ended),
    hold_expiring:
      params.hold_expiring === undefined ? '' : String(params.hold_expiring),
    needs_action:
      params.needs_action === undefined ? '' : String(params.needs_action),
    overdue: params.overdue === undefined ? '' : String(params.overdue),
    remaining_amount_gt:
      params.remaining_amount_gt === undefined
        ? ''
        : String(params.remaining_amount_gt),
    status: params.status ?? '',
  }
}

function paramsFromFilterState(filters: FilterState): BookingsQueryParams {
  return {
    ...(filters.court ? { court: filters.court } : {}),
    ...(filters.date ? { date: filters.date } : {}),
    ...(filters.date_from ? { date_from: filters.date_from } : {}),
    ...(filters.date_to ? { date_to: filters.date_to } : {}),
    ...(filters.ended ? { ended: filters.ended } : {}),
    ...(filters.hold_expiring ? { hold_expiring: filters.hold_expiring } : {}),
    ...(filters.needs_action ? { needs_action: filters.needs_action } : {}),
    ...(filters.overdue ? { overdue: filters.overdue } : {}),
    ...(filters.remaining_amount_gt
      ? { remaining_amount_gt: filters.remaining_amount_gt }
      : {}),
    ...(filters.status ? { status: filters.status } : {}),
  }
}

function getBookingsSearch(params: BookingsQueryParams): string {
  return buildPathWithQuery('', params as Record<string, QueryParamValue>)
}

interface BookingsFilterFormProps {
  initialFilters: FilterState
  isLoading: boolean
  onApply: (filters: FilterState) => void
  onReset: () => void
}

function BookingsFilterForm({
  initialFilters,
  isLoading,
  onApply,
  onReset,
}: BookingsFilterFormProps) {
  const [filters, setFilters] = useState<FilterState>(initialFilters)

  function updateFilter(field: keyof FilterState, value: string): void {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [field]: value,
    }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    onApply(filters)
  }

  return (
    <form
      className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5"
      onSubmit={handleSubmit}
    >
      <label className="space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
        <span>تاريخ محدد</span>
        <input
          className="h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 text-sm outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
          onChange={(event) => updateFilter('date', event.target.value)}
          type="date"
          value={filters.date}
        />
      </label>

      <label className="space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
        <span>من تاريخ</span>
        <input
          className="h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 text-sm outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
          onChange={(event) => updateFilter('date_from', event.target.value)}
          type="date"
          value={filters.date_from}
        />
      </label>

      <label className="space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
        <span>إلى تاريخ</span>
        <input
          className="h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 text-sm outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
          onChange={(event) => updateFilter('date_to', event.target.value)}
          type="date"
          value={filters.date_to}
        />
      </label>

      <label className="space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
        <span>الملعب</span>
        <input
          className="h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 text-sm outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
          inputMode="numeric"
          onChange={(event) => updateFilter('court', event.target.value)}
          placeholder="مثال: 3"
          type="text"
          value={filters.court}
        />
      </label>

      <label className="space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
        <span>الحالة</span>
        <select
          className="h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 text-sm outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
          onChange={(event) => updateFilter('status', event.target.value)}
          value={filters.status}
        >
          <option value="">الكل</option>
          {Object.entries(bookingStatusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
        <span>تحتاج إجراء</span>
        <select
          className="h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 text-sm outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
          onChange={(event) => updateFilter('needs_action', event.target.value)}
          value={filters.needs_action}
        >
          <option value="">الكل</option>
          <option value="true">نعم</option>
        </select>
      </label>

      <label className="space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
        <span>متأخرة</span>
        <select
          className="h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 text-sm outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
          onChange={(event) => updateFilter('overdue', event.target.value)}
          value={filters.overdue}
        >
          <option value="">الكل</option>
          <option value="true">نعم</option>
        </select>
      </label>

      <label className="space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
        <span>بها مبلغ متبقي</span>
        <input
          className="h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 text-sm outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
          inputMode="numeric"
          onChange={(event) =>
            updateFilter('remaining_amount_gt', event.target.value)
          }
          placeholder="0"
          type="text"
          value={filters.remaining_amount_gt}
        />
      </label>

      <label className="space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
        <span>انتهى وقتها</span>
        <select
          className="h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 text-sm outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
          onChange={(event) => updateFilter('ended', event.target.value)}
          value={filters.ended}
        >
          <option value="">الكل</option>
          <option value="true">نعم</option>
        </select>
      </label>

      <label className="space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
        <span>انتظار قاربت على الانتهاء</span>
        <select
          className="h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 text-sm outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
          onChange={(event) => updateFilter('hold_expiring', event.target.value)}
          value={filters.hold_expiring}
        >
          <option value="">الكل</option>
          <option value="true">نعم</option>
        </select>
      </label>

      <div className="flex flex-col gap-2 xl:justify-end">
        <AppButton disabled={isLoading} fullWidth type="submit">
          تطبيق الفلاتر
        </AppButton>
        <AppButton
          disabled={isLoading}
          fullWidth
          onClick={onReset}
          type="button"
          variant="secondary"
        >
          إعادة ضبط
        </AppButton>
      </div>
    </form>
  )
}

/**
 * Filtered booking review page used by Summary redirects.
 */
export function BookingsListPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { selectedClubSlug, selectedMembership } = useAuth()
  const [usesUnfilteredEmptyUrl, setUsesUnfilteredEmptyUrl] = useState(false)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const selectedClubName = selectedMembership?.club.name ?? null
  const urlParams = useMemo(
    () => parseBookingsQueryParams(location.search),
    [location.search],
  )
  const urlHasBookingFilters = hasBookingFilters(urlParams)
  const effectiveParams = useMemo(() => {
    if (urlHasBookingFilters) {
      return urlParams
    }

    return usesUnfilteredEmptyUrl ? {} : createDefaultQueryParams()
  }, [urlHasBookingFilters, urlParams, usesUnfilteredEmptyUrl])
  const initialFilters = useMemo(
    () => filterStateFromParams(effectiveParams),
    [effectiveParams],
  )
  const activeFilterChips = getActiveBookingFilterChips(effectiveParams)
  const hasActiveFilters = activeFilterChips.length > 0

  useEffect(() => {
    let isActive = true

    async function loadBookings(): Promise<void> {
      if (!selectedClubSlug) {
        setBookings([])
        setError(null)
        setMessage('اختر ناديًا أولًا لعرض الحجوزات')
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)
      setMessage(null)

      try {
        const bookingsResponse = await listBookings(
          selectedClubSlug,
          effectiveParams,
        )

        if (isActive) {
          setBookings(bookingsResponse.results)
        }
      } catch (error) {
        if (isActive) {
          setBookings([])
          setError(getApiErrorMessage(error, 'تعذر تحميل الحجوزات'))
        }
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    void loadBookings()

    return () => {
      isActive = false
    }
  }, [effectiveParams, selectedClubSlug])

  function handleApplyFilters(nextFilters: FilterState): void {
    const nextParams = paramsFromFilterState(nextFilters)
    const nextSearch = getBookingsSearch(nextParams)

    setUsesUnfilteredEmptyUrl(!nextSearch)
    navigate(
      {
        pathname: location.pathname,
        search: nextSearch,
      },
      { replace: false },
    )
  }

  function handleResetFilters(): void {
    const defaultParams = createDefaultQueryParams()

    setUsesUnfilteredEmptyUrl(false)
    navigate(
      {
        pathname: location.pathname,
        search: getBookingsSearch(defaultParams),
      },
      { replace: false },
    )
  }

  function handleRemoveFilter(key: BookingFilterChipKey): void {
    const nextParams = { ...effectiveParams }

    delete nextParams[key]

    const nextSearch = getBookingsSearch(nextParams)

    setUsesUnfilteredEmptyUrl(!nextSearch)
    navigate(
      {
        pathname: location.pathname,
        search: nextSearch,
      },
      { replace: false },
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        description={
          selectedClubName
            ? `قائمة مراجعة الحجوزات داخل ${selectedClubName}`
            : 'قائمة مراجعة الحجوزات حسب الفلاتر'
        }
        tone="brand"
        title="الحجوزات"
      />

      <AppCard>
        <BookingsFilterForm
          initialFilters={initialFilters}
          isLoading={isLoading}
          key={getBookingsSearch(effectiveParams) || 'empty-filters'}
          onApply={handleApplyFilters}
          onReset={handleResetFilters}
        />
      </AppCard>

      <BookingFilterChips
        chips={activeFilterChips}
        onRemove={handleRemoveFilter}
      />

      {isLoading ? (
        <AppCard>
          <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
            جاري تحميل الحجوزات...
          </p>
        </AppCard>
      ) : null}

      {!isLoading && error ? (
        <AppCard>
          <p className="text-sm font-bold text-[var(--sloty-danger)]">{error}</p>
        </AppCard>
      ) : null}

      {!isLoading && !error && message ? (
        <AppCard>
          <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
            {message}
          </p>
        </AppCard>
      ) : null}

      {!isLoading && !error && !message && bookings.length === 0 ? (
        <AppCard>
          <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
            {hasActiveFilters
              ? 'لا توجد حجوزات مطابقة للفلاتر الحالية'
              : 'لا توجد حجوزات لهذا اليوم'}
          </p>
        </AppCard>
      ) : null}

      {!isLoading && !error && bookings.length > 0 ? (
        <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {bookings.map((booking) => (
            <BookingListCard booking={booking} key={booking.id} />
          ))}
        </section>
      ) : null}
    </div>
  )
}
