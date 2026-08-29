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
import { ListSortControl } from '../../../shared/components/ListSortControl/ListSortControl'
import type { ListSortValue } from '../../../shared/components/ListSortControl/ListSortControl'
import { bookingActionCopy, customerCopy, recurringCopy } from '../../../shared/copy/appCopy'
import { useRequestGeneration } from '../../../shared/hooks/useRequestGeneration'
import { buildPathWithQuery } from '../../../shared/utils/buildPathWithQuery'
import type { QueryParamValue } from '../../../shared/utils/buildPathWithQuery'
import { toQueryObject } from '../../../shared/utils/queryParams'
import { listCourts } from '../../courts/courtsApi'
import type { Court } from '../../courts/courts.types'
import { listBookings } from '../bookingsApi'
import type {
  Booking,
  BookingOrdering,
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

function isBookingOrdering(value: string): value is BookingOrdering {
  return value === 'start_time' || value === '-start_time'
}

function parseBookingOrdering(
  value: string | undefined,
): BookingOrdering | undefined {
  return value && isBookingOrdering(value) ? value : undefined
}

function listSortToBookingOrdering(value: ListSortValue): BookingOrdering {
  return value === 'oldest' ? 'start_time' : '-start_time'
}

function bookingOrderingToListSort(
  ordering?: BookingOrdering | '',
): ListSortValue {
  return ordering === 'start_time' ? 'oldest' : 'newest'
}

/**
 * Newest appointment-first is the Product default. The URL may omit
 * `ordering`, but the list request always sends the matching Backend value.
 */
function withBookingListOrdering(
  params: BookingsQueryParams,
): BookingsQueryParams {
  return {
    ...params,
    ordering: params.ordering === 'start_time' ? 'start_time' : '-start_time',
  }
}

function withPreservedOrdering(
  nextParams: BookingsQueryParams,
  currentParams: BookingsQueryParams,
): BookingsQueryParams {
  if (
    currentParams.ordering === 'start_time'
    || currentParams.ordering === '-start_time'
  ) {
    return {
      ...nextParams,
      ordering: currentParams.ordering,
    }
  }

  return nextParams
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

  const ordering = parseBookingOrdering(queryObject.ordering)

  if (ordering) {
    params.ordering = ordering
  }

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
  initialFilters: FilterState
  isLoading: boolean
  onClose?: () => void
  onApply: (filters: FilterState) => void
  onReset: () => void
}

function BookingsFilterForm({
  canChooseCourt,
  courtOptions,
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
          },
          {
            key: 'ended',
            label: 'انتهى وقتها',
            checked: filters.ended === 'true',
          },
          {
            key: 'hold_expiring',
            label: 'انتظار قاربت على الانتهاء',
            checked: filters.hold_expiring === 'true',
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
  const { role, selectedClubSlug, selectedMembership } = useAuth()
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
  const bookingDetailGenerationRef = useRef(0)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [openedBookingId, setOpenedBookingId] = useState<number | null>(null)
  const [isBookingDetailLoading, setIsBookingDetailLoading] = useState(false)
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
  const listSortValue = bookingOrderingToListSort(urlParams.ordering)

  useEffect(() => {
    let isActive = true

    async function loadCourtOptions(): Promise<void> {
      if (!selectedClubSlug || !canChooseCourt) {
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
  }, [canChooseCourt, selectedClubSlug])

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
      const bookingsResponse = await listBookings(
        selectedClubSlug,
        withBookingListOrdering(effectiveParams),
      )

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

      setBookings([])
      setPagination({ count: 0, hasNext: false, hasPrevious: false })
      setError(getApiErrorMessage(error, 'تعذر تحميل الحجوزات'))
    } finally {
      if (isCurrent(requestGeneration)) {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    }
  }, [effectiveParams, isCurrent, location.pathname, navigate, nextGeneration, selectedClubSlug])

  useEffect(() => {
    void Promise.resolve().then(() => reloadBookings())
  }, [reloadBookings])

  function handleApplyFilters(nextFilters: FilterState): void {
    const nextParams = withPreservedOrdering(
      {
        ...paramsFromFilterState(nextFilters),
        ...(effectiveParams.search ? { search: effectiveParams.search } : {}),
      },
      urlParams,
    )
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

  function handleSortChange(value: ListSortValue): void {
    if (value === listSortValue) {
      return
    }

    const nextParams = { ...urlParams }
    const nextOrdering = listSortToBookingOrdering(value)

    delete nextParams.page
    if (!canChooseCourt) {
      delete nextParams.court
    }

    if (nextOrdering === '-start_time') {
      delete nextParams.ordering
    } else {
      nextParams.ordering = nextOrdering
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
    bookingDetailGenerationRef.current += 1
    setSelectedBooking(null)
    setOpenedBookingId(null)
    setIsBookingDetailLoading(false)
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

  /**
   * History cards are reduced list rows. Opening details always loads the
   * Booking Detail resource before BookingActionSheet can treat it as
   * authoritative.
   */
  async function handleSelectBooking(booking: Booking): Promise<void> {
    if (!selectedClubSlug) {
      return
    }

    const generation = bookingDetailGenerationRef.current + 1
    bookingDetailGenerationRef.current = generation
    setOpenedBookingId(booking.id)
    setSelectedBooking(null)
    setIsBookingDetailLoading(true)
    setActionError(null)
    setActionFieldErrors(null)

    try {
      const freshBooking = await getBooking(selectedClubSlug, booking.id)

      if (bookingDetailGenerationRef.current !== generation) {
        return
      }

      setSelectedBooking(freshBooking)
    } catch (error) {
      if (bookingDetailGenerationRef.current !== generation) {
        return
      }

      setSelectedBooking(null)
      setActionError(
        getApiErrorMessage(error, bookingActionCopy.loadDetailFailure),
      )
    } finally {
      if (bookingDetailGenerationRef.current === generation) {
        setIsBookingDetailLoading(false)
      }
    }
  }

  async function handleRecordPayment(
    values: RecordPaymentSheetValues,
  ): Promise<void> {
    if (!selectedClubSlug || !paymentBooking) {
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

  async function handleFreeHoldBooking(booking: Booking): Promise<void> {
    if (!selectedClubSlug) {
      return
    }

    setIsActionSubmitting(true)
    setActionError(null)

    try {
      await cancelBooking(selectedClubSlug, booking.id, {
        reason: 'إلغاء الحجز المؤقت',
        notes: 'تم إلغاء الحجز من سجل الحجوزات',
      })
      setSelectedBooking(null)
      setSuccessMessage('تم إلغاء الحجز بنجاح')
      await reloadBookings()
    } catch (error) {
      setActionError(
        getApiErrorMessage(error, 'تعذر إلغاء الحجز. حاول مرة أخرى'),
      )
    } finally {
      setIsActionSubmitting(false)
    }
  }

  async function handleCancelBooking(
    values: CancelBookingReasonValues,
  ): Promise<void> {
    if (!selectedClubSlug || !cancellingBooking) {
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
    if (!selectedClubSlug) {
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
    if (!selectedClubSlug || !completingBooking) {
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
    if (!selectedClubSlug || !noShowBooking) {
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
    if (!selectedClubSlug) {
      return
    }

    setIsActionSubmitting(true)
    setActionError(null)

    try {
      const updatedBooking = await endBookingRecurrence(
        selectedClubSlug,
        booking.id,
      )
      setSelectedBooking(updatedBooking)
      setSuccessMessage(recurringCopy.stopWeeklySuccess)
      await reloadBookings()
    } catch (error) {
      setActionError(
        getApiErrorMessage(error, recurringCopy.stopWeeklyFailure),
      )
    } finally {
      setIsActionSubmitting(false)
    }
  }

  async function handleStartEditCustomer(booking: Booking): Promise<void> {
    if (!selectedClubSlug) {
      return
    }

    setIsActionSubmitting(true)
    setActionError(null)

    try {
      const freshBooking = await getBooking(selectedClubSlug, booking.id)
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
    if (!selectedClubSlug || !editingBooking) {
      return
    }

    setIsActionSubmitting(true)
    setActionError(null)
    setActionFieldErrors(null)

    try {
      await updateBookingCustomer(selectedClubSlug, editingBooking.id, payload)
      const freshBooking = await getBooking(selectedClubSlug, editingBooking.id)
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
    if (!selectedClubSlug) {
      return
    }

    setIsActionSubmitting(true)
    setActionError(null)

    try {
      const freshBooking = await getBooking(selectedClubSlug, booking.id)
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
    if (!selectedClubSlug || !reschedulingBooking) {
      return
    }

    setIsActionSubmitting(true)
    setActionError(null)
    setActionFieldErrors(null)

    try {
      await rescheduleBooking(selectedClubSlug, reschedulingBooking.id, payload)
      const freshBooking = await getBooking(
        selectedClubSlug,
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
              },
              {
                key: 'needs_action',
                label: 'تحتاج إجراء',
                checked: effectiveParams.needs_action === 'true',
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

      {/* RTL `justify-end` sits the arrows on the visual left, immediately before cards. */}
      <div className="flex justify-end">
        <ListSortControl
          disabled={isLoading && bookings.length === 0}
          onChange={handleSortChange}
          value={listSortValue}
        />
      </div>

      <ResultRefreshRegion
        isRefreshing={isRefreshing}
        label="جاري تحديث الحجوزات"
      >
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
        isLoadingDetail={isBookingDetailLoading}
        isOpen={Boolean(
          (selectedBooking ||
            isBookingDetailLoading ||
            (openedBookingId !== null && actionError)) &&
            !paymentBooking &&
            !cancellingBooking &&
            !completingBooking &&
            !noShowBooking &&
            !editingBooking &&
            !reschedulingBooking,
        )}
        isSubmitting={isActionSubmitting}
        onAddPayment={(booking) => {
          setPaymentBooking(booking)
          setPaymentError(null)
          setPaymentFieldErrors(null)
        }}
        onCancel={(booking) => {
          void handleRequestCancelBooking(booking)
        }}
        onClose={closeBookingSheets}
        onComplete={(booking) => {
          setCompletingBooking(booking)
          setCompletingBookingRemainingAmount(null)
          setActionError(null)
        }}
        onEditCustomer={(booking) => {
          void handleStartEditCustomer(booking)
        }}
        onEndRecurrence={(booking) => {
          void handleEndRecurrence(booking)
        }}
        onFreeHold={(booking) => {
          void handleFreeHoldBooking(booking)
        }}
        onNoShow={(booking) => {
          setNoShowBooking(booking)
          setActionError(null)
        }}
        onReschedule={(booking) => {
          void handleStartReschedule(booking)
        }}
      />

      {paymentBooking ? (
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

      {cancellingBooking ? (
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

      {completingBooking && selectedClubSlug ? (
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

      {editingBooking && selectedClubSlug ? (
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

      {reschedulingBooking && selectedClubSlug ? (
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

      {noShowBooking ? (
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
