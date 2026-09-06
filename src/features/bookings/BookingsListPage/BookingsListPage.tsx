import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react'
import { useLocation, useNavigate } from 'react-router'
import {
  getApiErrorCode,
  getApiErrorDetails,
  getApiErrorMessage,
  getApiFieldErrors,
  isApiClientError,
} from '../../../core/api/apiError.helpers'
import type { ApiFieldError } from '../../../core/api/apiClient'
import {
  canChooseOperationalCourt,
  getAssignedOperationalCourtId,
} from '../../../core/auth/auth.types'
import { useAuth } from '../../../core/auth/useAuth'
import { AppButton } from '../../../shared/components/AppButton/AppButton'
import { AppCard } from '../../../shared/components/AppCard/AppCard'
import { AppSelect } from '../../../shared/components/AppSelect/AppSelect'
import { FilterCheckboxGroup } from '../../../shared/components/FilterCheckboxGroup/FilterCheckboxGroup'
import { FilterSheet } from '../../../shared/components/FilterSheet/FilterSheet'
import { AppSuccessNotice } from '../../../shared/components/AppSuccessNotice/AppSuccessNotice'
import { LiveSearchField } from '../../../shared/components/LiveSearchField/LiveSearchField'
import { QuickSearchShortcuts } from '../../../shared/components/QuickSearchShortcuts/QuickSearchShortcuts'
import { ResultRefreshRegion } from '../../../shared/components/ResultRefreshRegion/ResultRefreshRegion'
import { customerCopy } from '../../../shared/copy/appCopy'
import { useRequestGeneration } from '../../../shared/hooks/useRequestGeneration'
import { buildPathWithQuery } from '../../../shared/utils/buildPathWithQuery'
import type { QueryParamValue } from '../../../shared/utils/buildPathWithQuery'
import { toQueryObject } from '../../../shared/utils/queryParams'
import { getScheduleFreshnessLabel } from '../../../offline/schedule/scheduleFreshness'
import type { OfflineScope } from '../../../offline/offline.types'
import {
  getOfflineBookingsView,
} from '../../../offline/bookings/offlineBookingFilters'
import { offlineRepositories } from '../../../offline/repositories/offlineRepositories'
import { useOfflineSync } from '../../../offline/sync/offlineSyncContext'
import { listCourts } from '../../courts/courtsApi'
import type { Court } from '../../courts/courts.types'
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
import { BookingActionSheet } from '../components/BookingActionSheet/BookingActionSheet'
import { EditBookingDetailsSheet } from '../components/EditBookingDetailsSheet/EditBookingDetailsSheet'
import { RescheduleBookingSheet } from '../components/RescheduleBookingSheet/RescheduleBookingSheet'
import { hasActiveRecurrence, shouldRefreshRecurrencePreview } from '../bookingRecurrence.helpers'
import { BookingListCard } from '../components/BookingListCard/BookingListCard'
import {
  CancelBookingReasonSheet,
  type CancelBookingReasonValues,
} from '../../schedule/components/CancelBookingReasonSheet/CancelBookingReasonSheet'
import { CompleteBookingConfirmSheet } from '../../schedule/components/CompleteBookingConfirmSheet/CompleteBookingConfirmSheet'
import {
  NoShowReasonSheet,
  type NoShowReasonValues,
} from '../../schedule/components/NoShowReasonSheet/NoShowReasonSheet'
import {
  cancelBooking,
  completeBooking,
  endBookingRecurrence,
  getBooking,
  markBookingNoShow,
  previewBookingCancellation,
  rescheduleBooking,
  updateBookingCustomer,
} from '../../schedule/scheduleApi'
import {
  BOOKING_COMPLETION_REQUIRES_FULL_PAYMENT,
  type BookingCompletePayload,
  type BookingCancellationPreview,
  type BookingCustomerUpdatePayload,
  type BookingReschedulePayload,
} from '../../schedule/scheduleApi.types'
import {
  RecordPaymentSheet,
  type RecordPaymentSheetValues,
} from '../../transactions/components/RecordPaymentSheet/RecordPaymentSheet'
import { createTransaction } from '../../transactions/transactionsApi'
import { notifyCurrentFinancialStateChanged } from '../../settlements/currentFinancialStateInvalidation'

const BOOKING_CANCELLATION_TIME_PASSED = 'BOOKING_CANCELLATION_TIME_PASSED'
const FIRST_PAYMENT_BELOW_MINIMUM_DEPOSIT = 'FIRST_PAYMENT_BELOW_MINIMUM_DEPOSIT'

interface FilterState {
  court: string
  date: string
  date_from: string
  date_to: string
  ended: string
  hold_expiring: string
  needs_action: string
  overdue: string
  upcoming: string
  has_remaining_amount: string
  status: BookingStatus | ''
}

type OperationalFilterKey =
  | 'ended'
  | 'hold_expiring'
  | 'overdue'

interface FilterOption {
  value: string
  label: string
}

interface PaginationState {
  count: number
  hasNext: boolean
  hasPrevious: boolean
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
  'search',
  'upcoming',
  'has_remaining_amount',
  'status',
] as const

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
      || key === 'upcoming'
      || key === 'has_remaining_amount'
    ) {
      params[key] = value
      return
    }

    if (key === 'court' || key === 'page') {
      params[key] = value
      return
    }

    if (
      key === 'date'
      || key === 'date_from'
      || key === 'date_to'
      || key === 'search'
    ) {
      params[key] = value
    }
  })

  return params
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
    upcoming: params.upcoming === undefined ? '' : String(params.upcoming),
    has_remaining_amount:
      params.has_remaining_amount === undefined
        ? ''
        : String(params.has_remaining_amount),
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
    ...(filters.upcoming ? { upcoming: filters.upcoming } : {}),
    ...(filters.has_remaining_amount
      ? { has_remaining_amount: filters.has_remaining_amount }
      : {}),
    ...(filters.status ? { status: filters.status } : {}),
  }
}

function getBookingsSearch(params: BookingsQueryParams): string {
  return buildPathWithQuery('', params as Record<string, QueryParamValue>)
}

interface BookingsFilterFormProps {
  canChooseCourt: boolean
  courtOptions: FilterOption[]
  disabledOperationalFilterKeys?: OperationalFilterKey[]
  initialFilters: FilterState
  isLoading: boolean
  onClose?: () => void
  onApply: (filters: FilterState) => void
  onReset: () => void
}

function BookingsFilterForm({
  canChooseCourt,
  courtOptions,
  disabledOperationalFilterKeys = [],
  initialFilters,
  isLoading,
  onClose,
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

  function updateOperationalFilter(
    key: string,
    checked: boolean,
  ): void {
    const field = key as OperationalFilterKey

    updateFilter(field, checked ? 'true' : '')
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    onApply(filters)
    onClose?.()
  }

  const courtFilterOptions = [
    { value: '', label: 'كل الملاعب' },
    ...(filters.court
    && !courtOptions.some((option) => option.value === filters.court)
      ? [{ value: filters.court, label: `ملعب #${filters.court}` }]
      : []),
    ...courtOptions,
  ]

  const bookingStatusFilterOptions = [
    { value: '', label: 'الكل' },
    ...Object.entries(bookingStatusLabels).map(([value, label]) => ({
      value,
      label,
    })),
  ]

  return (
    <form
      className="grid grid-cols-1 gap-3 md:grid-cols-2"
      onSubmit={handleSubmit}
    >
      <label className="space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
        <span>تاريخ محدد</span>
        <input
          className="sloty-mobile-safe-input h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
          onChange={(event) => updateFilter('date', event.target.value)}
          type="date"
          value={filters.date}
        />
      </label>

      <label className="space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
        <span>من تاريخ</span>
        <input
          className="sloty-mobile-safe-input h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
          onChange={(event) => updateFilter('date_from', event.target.value)}
          type="date"
          value={filters.date_from}
        />
      </label>

      <label className="space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
        <span>إلى تاريخ</span>
        <input
          className="sloty-mobile-safe-input h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
          onChange={(event) => updateFilter('date_to', event.target.value)}
          type="date"
          value={filters.date_to}
        />
      </label>

      {canChooseCourt ? (
        <AppSelect
          label="الملعب"
          onChange={(value) => updateFilter('court', value)}
          options={courtFilterOptions}
          value={filters.court}
        />
      ) : null}

      <AppSelect
        label="الحالة"
        onChange={(value) => updateFilter('status', value)}
        options={bookingStatusFilterOptions}
        value={filters.status}
      />

      <FilterCheckboxGroup
        className="md:col-span-2"
        label="فلاتر تشغيلية"
        onChange={updateOperationalFilter}
        options={[
          {
            key: 'overdue',
            label: 'متأخرة',
            checked: filters.overdue === 'true',
            disabled: disabledOperationalFilterKeys.includes('overdue'),
          },
          {
            key: 'ended',
            label: 'انتهى وقتها',
            checked: filters.ended === 'true',
            disabled: disabledOperationalFilterKeys.includes('ended'),
          },
          {
            key: 'hold_expiring',
            label: 'انتظار قاربت على الانتهاء',
            checked: filters.hold_expiring === 'true',
            disabled: disabledOperationalFilterKeys.includes('hold_expiring'),
          },
        ]}
      />

      <div className="flex flex-col gap-2 xl:justify-end">
        <AppButton disabled={isLoading} fullWidth type="submit">
          تطبيق الفلاتر
        </AppButton>
        <AppButton
          disabled={isLoading}
          fullWidth
          onClick={() => {
            onReset()
            onClose?.()
          }}
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
  const { currentUser, role, selectedClubSlug, selectedMembership } = useAuth()
  const { connectivity } = useOfflineSync()
  const canChooseCourt = canChooseOperationalCourt(role, selectedMembership)
  const assignedCourtId = getAssignedOperationalCourtId(
    role,
    selectedMembership,
  )
  const [bookings, setBookings] = useState<Booking[]>([])
  const [pagination, setPagination] = useState<PaginationState>({
    count: 0,
    hasNext: false,
    hasPrevious: false,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const hasCompletedInitialLoadRef = useRef(false)
  const { nextGeneration, isCurrent } = useRequestGeneration()
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [offlineLastSyncAt, setOfflineLastSyncAt] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [paymentBooking, setPaymentBooking] = useState<Booking | null>(null)
  const [cancellingBooking, setCancellingBooking] = useState<Booking | null>(null)
  const [cancellationPreview, setCancellationPreview] =
    useState<BookingCancellationPreview | null>(null)
  const [completingBooking, setCompletingBooking] = useState<Booking | null>(null)
  const [
    completingBookingRemainingAmount,
    setCompletingBookingRemainingAmount,
  ] = useState<string | null>(null)
  const [noShowBooking, setNoShowBooking] = useState<Booking | null>(null)
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null)
  const [reschedulingBooking, setReschedulingBooking] = useState<Booking | null>(
    null,
  )
  const [isPaymentSubmitting, setIsPaymentSubmitting] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [paymentFieldErrors, setPaymentFieldErrors] = useState<Record<
    string,
    ApiFieldError[]
  > | null>(null)
  const [isActionSubmitting, setIsActionSubmitting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionFieldErrors, setActionFieldErrors] = useState<Record<
    string,
    ApiFieldError[]
  > | null>(null)
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false)
  const [searchDraft, setSearchDraft] = useState('')
  const [courtOptions, setCourtOptions] = useState<FilterOption[]>([])
  const [courtRecords, setCourtRecords] = useState<Court[]>([])
  const [filterOptionsError, setFilterOptionsError] = useState<string | null>(null)
  const urlParams = useMemo(
    () => parseBookingsQueryParams(location.search),
    [location.search],
  )
  const isOfflineMode =
    connectivity.browserNetwork === 'offline' ||
    connectivity.backendReachability === 'unreachable'
  const offlineScope = useMemo<OfflineScope | null>(() => {
    if (!currentUser || !selectedClubSlug) {
      return null
    }

    return {
      userId: currentUser.id,
      clubSlug: selectedClubSlug,
    }
  }, [currentUser, selectedClubSlug])
  const effectiveParams = useMemo(() => {
    if (canChooseCourt) {
      return urlParams
    }

    const staffParams = { ...urlParams }
    delete staffParams.court
    if (assignedCourtId !== null) {
      staffParams.court = assignedCourtId
    }
    return staffParams
  }, [assignedCourtId, canChooseCourt, urlParams])
  const initialFilters = useMemo(
    () => filterStateFromParams(effectiveParams),
    [effectiveParams],
  )
  const courtLabels = useMemo(
    () => Object.fromEntries(
      courtOptions.map((option) => [option.value, option.label]),
    ),
    [courtOptions],
  )
  const visibleFilterParams = useMemo(() => {
    if (canChooseCourt) {
      return effectiveParams
    }

    const params = { ...effectiveParams }
    delete params.court
    return params
  }, [canChooseCourt, effectiveParams])
  const activeFilterChips = getActiveBookingFilterChips(
    visibleFilterParams,
    courtLabels,
  )
  const hasActiveFilters = activeFilterChips.length > 0
  const offlineFreshness = getScheduleFreshnessLabel(offlineLastSyncAt)
  const disabledOfflineOperationalFilters: OperationalFilterKey[] =
    isOfflineMode ? ['ended', 'hold_expiring', 'overdue'] : []

  const loadOfflineBookings = useCallback(async (
    requestGeneration: number,
    fallbackError?: unknown,
  ): Promise<boolean> => {
    if (!offlineScope) {
      return false
    }

    const metadata = await offlineRepositories.getSyncMetadata(offlineScope)
    const cachedBookings = await offlineRepositories.readCachedBookings(
      offlineScope,
    )

    if (!isCurrent(requestGeneration)) {
      return true
    }

    setOfflineLastSyncAt(metadata?.bookings_last_sync_at ?? null)
    setPagination({ count: 0, hasNext: false, hasPrevious: false })

    if (!metadata?.bookings_last_sync_at) {
      setBookings([])
      setError(null)
      setMessage(
        fallbackError
          ? 'تعذر الاتصال بالخادم، ومفيش سجل حجوزات محفوظ على الجهاز.'
          : 'سجل الحجوزات محتاج إنترنت أول مرة علشان يتعرض.',
      )
      return true
    }

    const offlineView = getOfflineBookingsView(cachedBookings, effectiveParams)

    if (offlineView.state === 'outside_window') {
      setBookings([])
      setError(null)
      setMessage('البيانات للفترة دي محتاجة إنترنت علشان تتعرض.')
      return true
    }

    if (offlineView.state === 'unsupported_filter') {
      setBookings([])
      setError(null)
      setMessage('الفلاتر التشغيلية دي محتاجة إنترنت علشان تتعرض.')
      return true
    }

    setBookings(offlineView.bookings)
    setError(null)
    setMessage(null)
    hasCompletedInitialLoadRef.current = true

    return true
  }, [effectiveParams, isCurrent, offlineScope])

  useEffect(() => {
    let isActive = true

    async function loadCourtOptions(): Promise<void> {
      if (!selectedClubSlug || !canChooseCourt || isOfflineMode) {
        setCourtOptions([])
        setCourtRecords([])
        setFilterOptionsError(null)
        return
      }

      setFilterOptionsError(null)

      try {
        const courtsResponse = await listCourts(selectedClubSlug)

        if (!isActive) {
          return
        }

        setCourtRecords(courtsResponse.results)
        setCourtOptions(
          courtsResponse.results
            .filter((court: Court) => court.is_active)
            .map((court) => ({
              value: String(court.id),
              label: court.name,
            })),
        )
      } catch {
        if (isActive) {
          setCourtOptions([])
          setCourtRecords([])
          setFilterOptionsError('تعذر تحميل خيارات الفلاتر')
        }
      }
    }

    void loadCourtOptions()

    return () => {
      isActive = false
    }
  }, [canChooseCourt, isOfflineMode, selectedClubSlug])

  const reloadBookings = useCallback(async (): Promise<void> => {
    const requestGeneration = nextGeneration()

    if (!selectedClubSlug) {
      setBookings([])
      setPagination({ count: 0, hasNext: false, hasPrevious: false })
      setError(null)
      setMessage('اختر ناديًا أولًا لعرض الحجوزات')
      setIsLoading(false)
      setIsRefreshing(false)
      hasCompletedInitialLoadRef.current = false
      return
    }

    if (hasCompletedInitialLoadRef.current) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }
    setError(null)
    setMessage(null)

    try {
      if (isOfflineMode) {
        await loadOfflineBookings(requestGeneration)
        return
      }

      const bookingsResponse = await listBookings(selectedClubSlug, effectiveParams)

      if (!isCurrent(requestGeneration)) {
        return
      }

      if (
        bookingsResponse.results.length === 0
        && bookingsResponse.previous
        && Number(effectiveParams.page || 1) > 1
      ) {
        const previousPageParams = { ...effectiveParams }
        const previousPage = Number(effectiveParams.page) - 1
        if (previousPage <= 1) {
          delete previousPageParams.page
        } else {
          previousPageParams.page = String(previousPage)
        }
        navigate(
          {
            pathname: location.pathname,
            search: getBookingsSearch(previousPageParams),
          },
          { replace: true },
        )
        return
      }

      setBookings(bookingsResponse.results)
      setOfflineLastSyncAt(null)
      setPagination({
        count: bookingsResponse.count,
        hasNext: Boolean(bookingsResponse.next),
        hasPrevious: Boolean(bookingsResponse.previous),
      })
      hasCompletedInitialLoadRef.current = true
    } catch (error) {
      if (!isCurrent(requestGeneration)) {
        return
      }

      if (isApiClientError(error) && (error.status === 0 || error.status >= 500)) {
        try {
          if (await loadOfflineBookings(requestGeneration, error)) {
            return
          }
        } catch {
          // Keep the original API error visible if IndexedDB fallback also fails.
        }
      }

      setBookings([])
      setPagination({ count: 0, hasNext: false, hasPrevious: false })
      setError(getApiErrorMessage(error, 'تعذر تحميل الحجوزات'))
    } finally {
      if (isCurrent(requestGeneration)) {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    }
  }, [
    effectiveParams,
    isCurrent,
    isOfflineMode,
    loadOfflineBookings,
    location.pathname,
    navigate,
    nextGeneration,
    selectedClubSlug,
  ])

  useEffect(() => {
    void Promise.resolve().then(() => reloadBookings())
  }, [reloadBookings])

  function handleApplyFilters(nextFilters: FilterState): void {
    const nextParams = {
      ...paramsFromFilterState(nextFilters),
      ...(effectiveParams.search ? { search: effectiveParams.search } : {}),
    }
    delete nextParams.page
    if (!canChooseCourt) {
      delete nextParams.court
    }
    const nextSearch = getBookingsSearch(nextParams)

    navigate(
      {
        pathname: location.pathname,
        search: nextSearch,
      },
      { replace: false },
    )
  }

  function handleResetFilters(): void {
    const nextParams: BookingsQueryParams = {
      ...(effectiveParams.needs_action
        ? { needs_action: effectiveParams.needs_action }
        : {}),
      ...(effectiveParams.has_remaining_amount !== undefined
        ? { has_remaining_amount: effectiveParams.has_remaining_amount }
        : {}),
      ...(effectiveParams.upcoming !== undefined
        ? { upcoming: effectiveParams.upcoming }
        : {}),
      ...(effectiveParams.search ? { search: effectiveParams.search } : {}),
    }

    navigate(
      {
        pathname: location.pathname,
        search: getBookingsSearch(nextParams),
      },
      { replace: false },
    )
  }

  function handleRemoveFilter(key: BookingFilterChipKey): void {
    const nextParams = { ...urlParams }

    delete nextParams[key]
    delete nextParams.page

    const nextSearch = getBookingsSearch(nextParams)

    navigate(
      {
        pathname: location.pathname,
        search: nextSearch,
      },
      { replace: false },
    )
  }

  function handlePrimaryFilter(key: string, checked: boolean): void {
    const nextParams = { ...urlParams }
    delete nextParams.page

    if (key === 'needs_action') {
      if (checked) {
        nextParams.needs_action = 'true'
      } else {
        delete nextParams.needs_action
      }
    }

    if (key === 'has_remaining_amount') {
      if (checked) {
        nextParams.has_remaining_amount = 'true'
      } else {
        delete nextParams.has_remaining_amount
      }
    }

    if (key === 'upcoming') {
      if (checked) {
        nextParams.upcoming = 'true'
      } else {
        delete nextParams.upcoming
      }
    }

    navigate(
      {
        pathname: location.pathname,
        search: getBookingsSearch(nextParams),
      },
      { replace: false },
    )
  }

  const handleSearch = useCallback((value: string): void => {
    const nextParams = { ...urlParams }
    delete nextParams.page
    if (value) {
      nextParams.search = value
    } else {
      delete nextParams.search
    }
    if (!canChooseCourt) {
      delete nextParams.court
    }

    navigate(
      {
        pathname: location.pathname,
        search: getBookingsSearch(nextParams),
      },
      { replace: true },
    )
  }, [canChooseCourt, location.pathname, navigate, urlParams])

  function handlePageChange(nextPage: number): void {
    const nextParams = { ...urlParams }

    if (nextPage <= 1) {
      delete nextParams.page
    } else {
      nextParams.page = String(nextPage)
    }

    navigate(
      {
        pathname: location.pathname,
        search: getBookingsSearch(nextParams),
      },
      { replace: false },
    )
  }

  function closeBookingSheets(): void {
    setSelectedBooking(null)
    setPaymentBooking(null)
    setCancellingBooking(null)
    setCancellationPreview(null)
    setCompletingBooking(null)
    setCompletingBookingRemainingAmount(null)
    setNoShowBooking(null)
    setEditingBooking(null)
    setReschedulingBooking(null)
    setPaymentError(null)
    setPaymentFieldErrors(null)
    setActionError(null)
    setActionFieldErrors(null)
  }

  async function loadAuthoritativeBookingDetail(
    bookingId: number,
  ): Promise<Booking> {
    if (!selectedClubSlug) {
      throw new Error('Booking detail requires a selected Club.')
    }

    const freshBooking = await getBooking(selectedClubSlug, bookingId)

    if (offlineScope) {
      void offlineRepositories.saveBookingDetail(
        offlineScope,
        freshBooking,
        new Date().toISOString(),
      )
    }

    return freshBooking
  }

  async function handleSelectBooking(booking: Booking): Promise<void> {
    setSelectedBooking(booking)
    setActionError(null)
    setActionFieldErrors(null)

    if (!isOfflineMode || !offlineScope) {
      return
    }

    const cachedDetail = await offlineRepositories.readBookingDetail(
      offlineScope,
      booking.id,
    )

    if (cachedDetail) {
      setSelectedBooking(cachedDetail)
    }
  }

  function blockOfflineMutation(): boolean {
    if (!isOfflineMode) {
      return false
    }

    setActionError('يحتاج اتصال بالإنترنت')
    return true
  }

  async function handleRecordPayment(
    values: RecordPaymentSheetValues,
  ): Promise<void> {
    if (!selectedClubSlug || !paymentBooking || blockOfflineMutation()) {
      return
    }

    setIsPaymentSubmitting(true)
    setPaymentError(null)
    setPaymentFieldErrors(null)

    try {
      await createTransaction(selectedClubSlug, {
        booking: paymentBooking.id,
        amount: values.amount,
        payment_method: values.payment_method,
        ...(values.reference
          ? { payment_reference: values.reference }
          : {}),
        ...(values.notes ? { notes: values.notes } : {}),
      })
      setPaymentBooking(null)
      setSelectedBooking(null)
      setSuccessMessage(
        paymentBooking.status === 'HOLD'
          ? 'تم تسجيل العربون وتأكيد الحجز بنجاح'
          : 'تم تسجيل التحصيل بنجاح',
      )
      notifyCurrentFinancialStateChanged({
        clubSlug: selectedClubSlug,
        reason: 'booking-payment',
      })
      await reloadBookings()
    } catch (error) {
      const errorCode = getApiErrorCode(error)

      setPaymentError(
        errorCode === FIRST_PAYMENT_BELOW_MINIMUM_DEPOSIT
          ? getApiErrorMessage(
              error,
              'أول دفعة يجب ألا تقل عن الحد الأدنى للعربون المطلوب.',
            )
          : getApiErrorMessage(
              error,
              'تعذر تسجيل الدفعة. تأكد من البيانات وحاول مرة أخرى',
            ),
      )
      setPaymentFieldErrors(getApiFieldErrors(error))
      throw error
    } finally {
      setIsPaymentSubmitting(false)
    }
  }

  async function handleCancelBooking(
    values: CancelBookingReasonValues,
  ): Promise<void> {
    if (!selectedClubSlug || !cancellingBooking || blockOfflineMutation()) {
      return
    }

    setIsActionSubmitting(true)
    setActionError(null)
    setActionFieldErrors(null)

    try {
      await cancelBooking(selectedClubSlug, cancellingBooking.id, values)
      setCancellingBooking(null)
      setCancellationPreview(null)
      setSelectedBooking(null)
      setSuccessMessage('تم إلغاء الحجز بنجاح')
      notifyCurrentFinancialStateChanged({
        clubSlug: selectedClubSlug,
        reason: 'booking-cancellation',
      })
      await reloadBookings()
    } catch (error) {
      if (getApiErrorCode(error) === BOOKING_CANCELLATION_TIME_PASSED) {
        setActionError('انتهى وقت إلغاء هذا الحجز لأنه بدأ بالفعل.')
        await reloadBookings()
      } else {
        setActionError(
          getApiErrorMessage(error, 'تعذر إلغاء الحجز. حاول مرة أخرى'),
        )
      }
      setActionFieldErrors(getApiFieldErrors(error))
      throw error
    } finally {
      setIsActionSubmitting(false)
    }
  }

  async function handleRequestCancelBooking(booking: Booking): Promise<void> {
    if (!selectedClubSlug || blockOfflineMutation()) {
      return
    }

    setIsActionSubmitting(true)
    setActionError(null)
    setActionFieldErrors(null)
    setCancellationPreview(null)

    try {
      const preview = await previewBookingCancellation(
        selectedClubSlug,
        booking.id,
      )

      setCancellationPreview(preview)
      setCancellingBooking(booking)
    } catch (error) {
      if (getApiErrorCode(error) === BOOKING_CANCELLATION_TIME_PASSED) {
        setActionError('انتهى وقت إلغاء هذا الحجز لأنه بدأ بالفعل.')
        await reloadBookings()
      } else {
        setActionError(
          getApiErrorMessage(error, 'تعذر معاينة إلغاء الحجز. حاول مرة أخرى'),
        )
      }
      setActionFieldErrors(getApiFieldErrors(error))
    } finally {
      setIsActionSubmitting(false)
    }
  }

  async function handleCompleteBooking(
    payload?: BookingCompletePayload,
  ): Promise<void> {
    if (!selectedClubSlug || !completingBooking || blockOfflineMutation()) {
      return
    }

    setIsActionSubmitting(true)
    setActionError(null)

    try {
      if (payload) {
        await completeBooking(selectedClubSlug, completingBooking.id, payload)
      } else {
        await completeBooking(selectedClubSlug, completingBooking.id)
      }
      setCompletingBooking(null)
      setCompletingBookingRemainingAmount(null)
      setSelectedBooking(null)
      setSuccessMessage('تم إكمال الحجز بنجاح')
      await reloadBookings()
    } catch (error) {
      if (getApiErrorCode(error) === BOOKING_COMPLETION_REQUIRES_FULL_PAYMENT) {
        const remainingAmount = getApiErrorDetails(error)?.remaining_amount

        if (
          typeof remainingAmount === 'string' ||
          typeof remainingAmount === 'number'
        ) {
          setCompletingBookingRemainingAmount(String(remainingAmount))
        }
      }

      setActionError(
        getApiErrorMessage(error, 'تعذر إكمال الحجز. حاول مرة أخرى'),
      )
      if (shouldRefreshRecurrencePreview(getApiErrorCode(error))) {
        throw error
      }
    } finally {
      setIsActionSubmitting(false)
    }
  }

  async function handleNoShowBooking(
    values: NoShowReasonValues,
  ): Promise<void> {
    if (!selectedClubSlug || !noShowBooking || blockOfflineMutation()) {
      return
    }

    setIsActionSubmitting(true)
    setActionError(null)

    try {
      await markBookingNoShow(selectedClubSlug, noShowBooking.id, values)
      setNoShowBooking(null)
      setSelectedBooking(null)
      setSuccessMessage('تم تسجيل عدم الحضور بنجاح')
      await reloadBookings()
    } catch (error) {
      setActionError(
        getApiErrorMessage(error, 'تعذر تسجيل عدم الحضور. حاول مرة أخرى'),
      )
      throw error
    } finally {
      setIsActionSubmitting(false)
    }
  }

  async function handleEndRecurrence(booking: Booking): Promise<void> {
    if (!selectedClubSlug || blockOfflineMutation()) {
      return
    }

    setIsActionSubmitting(true)
    setActionError(null)

    try {
      const updatedBooking = await endBookingRecurrence(
        selectedClubSlug,
        booking.id,
      )
      if (offlineScope) {
        void offlineRepositories.saveBookingDetail(
          offlineScope,
          updatedBooking,
          new Date().toISOString(),
        )
      }
      setSelectedBooking(updatedBooking)
      setSuccessMessage('تم إيقاف الحجز الأسبوعي')
      await reloadBookings()
    } catch (error) {
      setActionError(
        getApiErrorMessage(error, 'تعذر إيقاف الحجز الأسبوعي. حاول مرة أخرى'),
      )
    } finally {
      setIsActionSubmitting(false)
    }
  }

  async function handleStartEditCustomer(booking: Booking): Promise<void> {
    if (!selectedClubSlug || blockOfflineMutation()) {
      return
    }

    setIsActionSubmitting(true)
    setActionError(null)

    try {
      const freshBooking = await loadAuthoritativeBookingDetail(booking.id)
      setEditingBooking(freshBooking)
    } catch (error) {
      setActionError(
        getApiErrorMessage(error, 'تعذر تحميل بيانات الحجز. حاول مرة أخرى'),
      )
    } finally {
      setIsActionSubmitting(false)
    }
  }

  async function handleUpdateBookingCustomer(
    payload: BookingCustomerUpdatePayload,
  ): Promise<void> {
    if (!selectedClubSlug || !editingBooking || blockOfflineMutation()) {
      return
    }

    setIsActionSubmitting(true)
    setActionError(null)
    setActionFieldErrors(null)

    try {
      await updateBookingCustomer(selectedClubSlug, editingBooking.id, payload)
      const freshBooking = await loadAuthoritativeBookingDetail(editingBooking.id)
      setEditingBooking(null)
      setSelectedBooking(freshBooking)
      setSuccessMessage('تم تحديث بيانات الحجز')
      await reloadBookings()
    } catch (error) {
      setActionError(
        getApiErrorMessage(error, 'تعذر تحديث بيانات الحجز. حاول مرة أخرى'),
      )
      setActionFieldErrors(getApiFieldErrors(error))
    } finally {
      setIsActionSubmitting(false)
    }
  }

  async function handleStartReschedule(booking: Booking): Promise<void> {
    if (!selectedClubSlug || blockOfflineMutation()) {
      return
    }

    setIsActionSubmitting(true)
    setActionError(null)

    try {
      const freshBooking = await loadAuthoritativeBookingDetail(booking.id)
      setReschedulingBooking(freshBooking)
    } catch (error) {
      setActionError(
        getApiErrorMessage(error, 'تعذر تحميل بيانات الحجز. حاول مرة أخرى'),
      )
    } finally {
      setIsActionSubmitting(false)
    }
  }

  async function handleRescheduleBooking(
    payload: BookingReschedulePayload,
  ): Promise<void> {
    if (!selectedClubSlug || !reschedulingBooking || blockOfflineMutation()) {
      return
    }

    setIsActionSubmitting(true)
    setActionError(null)
    setActionFieldErrors(null)

    try {
      await rescheduleBooking(selectedClubSlug, reschedulingBooking.id, payload)
      const freshBooking = await loadAuthoritativeBookingDetail(
        reschedulingBooking.id,
      )
      setReschedulingBooking(null)
      setSelectedBooking(freshBooking)
      setSuccessMessage('تم تغيير الموعد بنجاح')
      await reloadBookings()
    } catch (error) {
      setActionError(
        getApiErrorMessage(error, 'تعذر تغيير الموعد. حاول مرة أخرى'),
      )
      setActionFieldErrors(getApiFieldErrors(error))
      throw error
    } finally {
      setIsActionSubmitting(false)
    }
  }

  return (
    <div className="space-y-5">
      <LiveSearchField
        label={customerCopy.customerOrMobileSearch}
        onDraftChange={setSearchDraft}
        onSearch={handleSearch}
        placeholder={customerCopy.customerOrMobileSearch}
        value={effectiveParams.search ?? ''}
      />

      <QuickSearchShortcuts searchQuery={searchDraft}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <FilterCheckboxGroup
            className="min-w-0 flex-1"
            label="مراجعة سريعة"
            onChange={handlePrimaryFilter}
            options={[
              {
                key: 'upcoming',
                label: 'الحجوزات القادمة فقط',
                checked: effectiveParams.upcoming === 'true',
                disabled: isOfflineMode,
              },
              {
                key: 'needs_action',
                label: 'تحتاج إجراء',
                checked: effectiveParams.needs_action === 'true',
                disabled: isOfflineMode,
              },
              {
                key: 'has_remaining_amount',
                label: 'بها مبلغ متبقي',
                checked: effectiveParams.has_remaining_amount === 'true',
              },
            ]}
          />
          <AppButton onClick={() => setIsFilterSheetOpen(true)} type="button">
            فلاتر إضافية
          </AppButton>
        </div>
      </QuickSearchShortcuts>

      {filterOptionsError ? (
        <p className="text-xs font-bold text-[var(--sloty-danger)]">
          {filterOptionsError}
        </p>
      ) : null}

      <FilterSheet
        isOpen={isFilterSheetOpen}
        onClose={() => setIsFilterSheetOpen(false)}
        title="فلترة الحجوزات"
      >
        <BookingsFilterForm
          canChooseCourt={canChooseCourt}
          courtOptions={courtOptions}
          disabledOperationalFilterKeys={disabledOfflineOperationalFilters}
          initialFilters={initialFilters}
          isLoading={isLoading}
          key={getBookingsSearch(effectiveParams) || 'empty-filters'}
          onApply={handleApplyFilters}
          onClose={() => setIsFilterSheetOpen(false)}
          onReset={handleResetFilters}
        />
      </FilterSheet>

      <BookingFilterChips
        chips={activeFilterChips}
        onRemove={handleRemoveFilter}
      />

      {isOfflineMode ? (
        <AppCard className="border-[var(--sloty-primary)]/20 bg-[var(--sloty-soft-mint)]">
          <p className="text-sm font-extrabold text-[var(--sloty-primary-dark)]">
            بدون إنترنت
            {offlineFreshness ? ` · ${offlineFreshness.text}` : ''}
          </p>
          {effectiveParams.search ? (
            <p className="mt-1 text-xs font-bold text-[var(--sloty-text-muted)]">
              بتبحث في البيانات المحفوظة على الجهاز. البحث دون إنترنت يشمل اسم
              العميل ورقم الموبايل فقط.
            </p>
          ) : (
            <p className="mt-1 text-xs font-bold text-[var(--sloty-text-muted)]">
              سجل الحجوزات المعروض محدود بآخر ٧ أيام محفوظة على الجهاز.
            </p>
          )}
        </AppCard>
      ) : null}

      <ResultRefreshRegion isRefreshing={isRefreshing}>
      {isLoading && bookings.length === 0 ? (
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
              ? effectiveParams.search
                ? 'ملقيناش حجوزات مطابقة للبحث.'
                : 'مفيش حجوزات مطابقة للفلاتر الحالية.'
              : 'مفيش حجوزات لسه.'}
          </p>
        </AppCard>
      ) : null}

      {(!isLoading || bookings.length > 0) && !error && bookings.length > 0 ? (
        <>
          <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {bookings.map((booking) => (
              <BookingListCard
                booking={booking}
                key={booking.id}
                onSelect={(booking) => {
                  void handleSelectBooking(booking)
                }}
              />
            ))}
          </section>

          {pagination.hasNext || pagination.hasPrevious ? (
            <nav
              aria-label="صفحات سجل الحجوزات"
              className="flex items-center justify-center gap-3"
            >
              <AppButton
                disabled={!pagination.hasPrevious}
                onClick={() => handlePageChange(
                  Math.max(1, Number(effectiveParams.page || 1) - 1),
                )}
                type="button"
                variant="secondary"
              >
                السابق
              </AppButton>
              <span className="text-sm font-bold text-[var(--sloty-text-muted)]">
                صفحة {effectiveParams.page || 1} · {pagination.count} حجز
              </span>
              <AppButton
                disabled={!pagination.hasNext}
                onClick={() => handlePageChange(
                  Number(effectiveParams.page || 1) + 1,
                )}
                type="button"
                variant="secondary"
              >
                التالي
              </AppButton>
            </nav>
          ) : null}
        </>
      ) : null}
      </ResultRefreshRegion>

      {successMessage ? (
        <AppSuccessNotice
          message={successMessage}
          onDismiss={() => setSuccessMessage(null)}
        />
      ) : null}

      <BookingActionSheet
        booking={selectedBooking}
        dateValue={typeof effectiveParams.date === 'string' ? effectiveParams.date : null}
        error={
          paymentBooking || cancellingBooking || completingBooking || noShowBooking
            ? null
            : actionError
        }
        notice={
          isOfflineMode
            ? 'بدون إنترنت · تفاصيل الحجز للقراءة فقط، والإجراءات تحتاج اتصال.'
            : null
        }
        isOpen={Boolean(
          selectedBooking &&
            !paymentBooking &&
            !cancellingBooking &&
            !completingBooking &&
            !noShowBooking &&
            !editingBooking &&
            !reschedulingBooking,
        )}
        isSubmitting={isActionSubmitting}
        onAddPayment={isOfflineMode
          ? undefined
          : (booking) => {
              setPaymentBooking(booking)
              setPaymentError(null)
              setPaymentFieldErrors(null)
            }}
        onCancel={isOfflineMode
          ? undefined
          : (booking) => {
              void handleRequestCancelBooking(booking)
            }}
        onClose={closeBookingSheets}
        onComplete={isOfflineMode
          ? undefined
          : (booking) => {
              setCompletingBooking(booking)
              setCompletingBookingRemainingAmount(null)
              setActionError(null)
            }}
        onEditCustomer={isOfflineMode
          ? undefined
          : (booking) => {
              void handleStartEditCustomer(booking)
            }}
        onEndRecurrence={isOfflineMode
          ? undefined
          : (booking) => {
              void handleEndRecurrence(booking)
            }}
        onFreeHold={isOfflineMode
          ? undefined
          : (booking) => {
              setCancellingBooking(booking)
              setCancellationPreview(null)
              setActionError(null)
              setActionFieldErrors(null)
            }}
        onNoShow={isOfflineMode
          ? undefined
          : (booking) => {
              setNoShowBooking(booking)
              setActionError(null)
            }}
        onReschedule={isOfflineMode
          ? undefined
          : (booking) => {
              void handleStartReschedule(booking)
            }}
      />

      {paymentBooking && !isOfflineMode ? (
        <RecordPaymentSheet
          bookingId={paymentBooking.id}
          bookingMoney={{
            totalPrice: paymentBooking.total_price,
            paidAmount: paymentBooking.paid_amount,
            remainingAmount: paymentBooking.remaining_amount,
          }}
          error={paymentError}
          fieldErrors={paymentFieldErrors}
          isSubmitting={isPaymentSubmitting}
          minimumDepositHint={
            paymentBooking
              ? courtRecords.find((court) => court.id === paymentBooking.court)
                  ?.minimum_deposit ?? null
              : null
          }
          paymentPurpose={paymentBooking.status === 'HOLD' ? 'deposit' : 'remaining'}
          onClose={() => {
            setPaymentBooking(null)
            setPaymentError(null)
            setPaymentFieldErrors(null)
          }}
          onSubmit={handleRecordPayment}
        />
      ) : null}

      {cancellingBooking && !isOfflineMode ? (
        <CancelBookingReasonSheet
          error={actionError}
          fieldErrors={actionFieldErrors}
          isSubmitting={isActionSubmitting}
          onClose={() => {
            setCancellingBooking(null)
            setCancellationPreview(null)
            setActionError(null)
            setActionFieldErrors(null)
          }}
          onSubmit={handleCancelBooking}
          preview={cancellationPreview}
          recurrenceWillEnd={hasActiveRecurrence(cancellingBooking)}
        />
      ) : null}

      {completingBooking && selectedClubSlug && !isOfflineMode ? (
        <CompleteBookingConfirmSheet
          booking={completingBooking}
          clubSlug={selectedClubSlug}
          error={actionError}
          isSubmitting={isActionSubmitting}
          onClose={() => {
            setCompletingBooking(null)
            setCompletingBookingRemainingAmount(null)
            setActionError(null)
          }}
          onConfirm={handleCompleteBooking}
          onRequestPayment={() => {
            setPaymentBooking({
              ...completingBooking,
              remaining_amount:
                completingBookingRemainingAmount ??
                completingBooking.remaining_amount,
            })
            setCompletingBooking(null)
            setCompletingBookingRemainingAmount(null)
            setActionError(null)
            setPaymentError(null)
            setPaymentFieldErrors(null)
          }}
          remainingAmount={
            completingBookingRemainingAmount ?? completingBooking.remaining_amount
          }
        />
      ) : null}

      {editingBooking && selectedClubSlug && !isOfflineMode ? (
        <EditBookingDetailsSheet
          booking={editingBooking}
          error={actionError}
          fieldErrors={actionFieldErrors}
          isSubmitting={isActionSubmitting}
          onClose={() => {
            setEditingBooking(null)
            setActionError(null)
            setActionFieldErrors(null)
          }}
          onSubmit={handleUpdateBookingCustomer}
        />
      ) : null}

      {reschedulingBooking && selectedClubSlug && !isOfflineMode ? (
        <RescheduleBookingSheet
          assignedCourtId={assignedCourtId}
          booking={reschedulingBooking}
          canChooseCourt={canChooseCourt}
          clubSlug={selectedClubSlug}
          error={actionError}
          fieldErrors={actionFieldErrors}
          isSubmitting={isActionSubmitting}
          onClose={() => {
            setReschedulingBooking(null)
            setActionError(null)
            setActionFieldErrors(null)
          }}
          onSubmit={handleRescheduleBooking}
        />
      ) : null}

      {noShowBooking && !isOfflineMode ? (
        <NoShowReasonSheet
          error={actionError}
          isSubmitting={isActionSubmitting}
          onClose={() => {
            setNoShowBooking(null)
            setActionError(null)
          }}
          onSubmit={handleNoShowBooking}
          recurrenceWillEnd={hasActiveRecurrence(noShowBooking)}
        />
      ) : null}
    </div>
  )
}
