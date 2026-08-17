import {
  useCallback,
  useEffect,
  useMemo,
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
import { useAuth } from '../../../core/auth/useAuth'
import { AppButton } from '../../../shared/components/AppButton/AppButton'
import { AppCard } from '../../../shared/components/AppCard/AppCard'
import { FilterSheet } from '../../../shared/components/FilterSheet/FilterSheet'
import { PageHeader } from '../../../shared/components/PageHeader/PageHeader'
import { buildPathWithQuery } from '../../../shared/utils/buildPathWithQuery'
import type { QueryParamValue } from '../../../shared/utils/buildPathWithQuery'
import { formatDateInputValue } from '../../../shared/utils/date'
import { toQueryObject } from '../../../shared/utils/queryParams'
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
  markBookingNoShow,
  previewBookingCancellation,
} from '../../schedule/scheduleApi'
import {
  BOOKING_COMPLETION_REQUIRES_FULL_PAYMENT,
  type BookingCancellationPreview,
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
  remaining_amount_gt: string
  status: BookingStatus | ''
}

interface FilterOption {
  value: string
  label: string
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
  courtOptions: FilterOption[]
  initialFilters: FilterState
  isLoading: boolean
  onClose?: () => void
  onApply: (filters: FilterState) => void
  onReset: () => void
}

function BookingsFilterForm({
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

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    onApply(filters)
    onClose?.()
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
        <select
          className="h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 text-sm outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
          onChange={(event) => updateFilter('court', event.target.value)}
          value={filters.court}
        >
          <option value="">كل الملاعب</option>
          {filters.court && !courtOptions.some((option) => option.value === filters.court) ? (
            <option value={filters.court}>ملعب #{filters.court}</option>
          ) : null}
          {courtOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
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
          onClick={() => {
            onReset()
            onClose?.()
          }}
          type="button"
          variant="secondary"
        >
          إعادة ضبط
        </AppButton>
        {onClose ? (
          <AppButton fullWidth onClick={onClose} type="button" variant="secondary">
            إغلاق
          </AppButton>
        ) : null}
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
  const [courtOptions, setCourtOptions] = useState<FilterOption[]>([])
  const [courtRecords, setCourtRecords] = useState<Court[]>([])
  const [filterOptionsError, setFilterOptionsError] = useState<string | null>(null)
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
  const courtLabels = useMemo(
    () => Object.fromEntries(
      courtOptions.map((option) => [option.value, option.label]),
    ),
    [courtOptions],
  )
  const activeFilterChips = getActiveBookingFilterChips(
    effectiveParams,
    courtLabels,
  )
  const hasActiveFilters = activeFilterChips.length > 0

  useEffect(() => {
    let isActive = true

    async function loadCourtOptions(): Promise<void> {
      if (!selectedClubSlug) {
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
  }, [selectedClubSlug])

  const reloadBookings = useCallback(async (): Promise<void> => {
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
      const bookingsResponse = await listBookings(selectedClubSlug, effectiveParams)

      setBookings(bookingsResponse.results)
    } catch (error) {
      setBookings([])
      setError(getApiErrorMessage(error, 'تعذر تحميل الحجوزات'))
    } finally {
      setIsLoading(false)
    }
  }, [effectiveParams, selectedClubSlug])

  useEffect(() => {
    void Promise.resolve().then(() => reloadBookings())
  }, [reloadBookings])

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

  function applyQuickParams(nextParams: BookingsQueryParams): void {
    setUsesUnfilteredEmptyUrl(false)
    navigate(
      {
        pathname: location.pathname,
        search: getBookingsSearch(nextParams),
      },
      { replace: false },
    )
  }

  function handleQuickToday(): void {
    applyQuickParams(createDefaultQueryParams())
  }

  function handleQuickNeedsClosing(): void {
    applyQuickParams({
      date: formatDateInputValue(new Date()),
      needs_action: 'true',
    })
  }

  function handleQuickHold(): void {
    applyQuickParams({
      date: formatDateInputValue(new Date()),
      status: 'HOLD',
    })
  }

  function closeBookingSheets(): void {
    setSelectedBooking(null)
    setPaymentBooking(null)
    setCancellingBooking(null)
    setCancellationPreview(null)
    setCompletingBooking(null)
    setCompletingBookingRemainingAmount(null)
    setNoShowBooking(null)
    setPaymentError(null)
    setPaymentFieldErrors(null)
    setActionError(null)
    setActionFieldErrors(null)
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
        ...(values.reference ? { reference: values.reference } : {}),
        ...(values.notes ? { notes: values.notes } : {}),
      })
      setPaymentBooking(null)
      setSuccessMessage('تم تسجيل الدفعة بنجاح')
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
        reason: 'تحرير الحجز المؤقت',
        notes: 'تم تحرير الموعد من سجل الحجوزات',
      })
      setSelectedBooking(null)
      setSuccessMessage('تم تحرير الموعد بنجاح')
      await reloadBookings()
    } catch (error) {
      setActionError(
        getApiErrorMessage(error, 'تعذر تحرير الموعد. حاول مرة أخرى'),
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
      setSelectedBooking(null)
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

  async function handleCompleteBooking(): Promise<void> {
    if (!selectedClubSlug || !completingBooking) {
      return
    }

    setIsActionSubmitting(true)
    setActionError(null)

    try {
      await completeBooking(selectedClubSlug, completingBooking.id)
      setCompletingBooking(null)
      setCompletingBookingRemainingAmount(null)
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

      <div className="flex gap-2 overflow-x-auto pb-1">
        <AppButton onClick={handleQuickToday} type="button" variant="secondary">
          اليوم
        </AppButton>
        <AppButton
          onClick={handleQuickNeedsClosing}
          type="button"
          variant="secondary"
        >
          تحتاج إغلاق
        </AppButton>
        <AppButton onClick={handleQuickHold} type="button" variant="secondary">
          بانتظار العربون
        </AppButton>
        <AppButton onClick={() => setIsFilterSheetOpen(true)} type="button">
          فلترة
        </AppButton>
      </div>

      {filterOptionsError ? (
        <p className="text-xs font-bold text-[var(--sloty-danger)]">
          {filterOptionsError}
        </p>
      ) : null}

      <AppCard className="hidden md:block">
        <BookingsFilterForm
          courtOptions={courtOptions}
          initialFilters={initialFilters}
          isLoading={isLoading}
          key={`desktop-${getBookingsSearch(effectiveParams) || 'empty-filters'}`}
          onApply={handleApplyFilters}
          onReset={handleResetFilters}
        />
      </AppCard>

      <FilterSheet
        isOpen={isFilterSheetOpen}
        onClose={() => setIsFilterSheetOpen(false)}
        title="فلترة الحجوزات"
      >
        <BookingsFilterForm
          courtOptions={courtOptions}
          initialFilters={initialFilters}
          isLoading={isLoading}
          key={`mobile-${getBookingsSearch(effectiveParams) || 'empty-filters'}`}
          onApply={handleApplyFilters}
          onClose={() => setIsFilterSheetOpen(false)}
          onReset={handleResetFilters}
        />
      </FilterSheet>

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
            <BookingListCard
              booking={booking}
              key={booking.id}
              onSelect={(booking) => {
                setSelectedBooking(booking)
                setActionError(null)
                setActionFieldErrors(null)
              }}
            />
          ))}
        </section>
      ) : null}

      {successMessage ? (
        <div className="fixed left-4 top-4 z-[70] max-w-sm rounded-2xl border border-[var(--sloty-primary)]/20 bg-[var(--sloty-soft-mint)] px-4 py-3 text-sm font-bold text-[var(--sloty-primary-dark)] shadow-[var(--sloty-shadow)]">
          <div className="flex items-center gap-3">
            <span>{successMessage}</span>
            <button
              className="rounded-lg px-2 py-1 text-xs hover:bg-white/70"
              onClick={() => setSuccessMessage(null)}
              type="button"
            >
              إغلاق
            </button>
          </div>
        </div>
      ) : null}

      <BookingActionSheet
        booking={selectedBooking}
        dateValue={typeof effectiveParams.date === 'string' ? effectiveParams.date : null}
        error={actionError}
        isOpen={Boolean(selectedBooking)}
        isSubmitting={isActionSubmitting}
        onAddPayment={(booking) => {
          setPaymentBooking(booking)
          setSelectedBooking(null)
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
          setSelectedBooking(null)
          setActionError(null)
        }}
        onFreeHold={(booking) => {
          void handleFreeHoldBooking(booking)
        }}
        onNoShow={(booking) => {
          setNoShowBooking(booking)
          setSelectedBooking(null)
          setActionError(null)
        }}
      />

      {paymentBooking ? (
        <RecordPaymentSheet
          bookingId={paymentBooking.id}
          error={paymentError}
          fieldErrors={paymentFieldErrors}
          isSubmitting={isPaymentSubmitting}
          minimumDepositHint={
            paymentBooking
              ? courtRecords.find((court) => court.id === paymentBooking.court)
                  ?.minimum_deposit ?? null
              : null
          }
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
        />
      ) : null}

      {completingBooking ? (
        <CompleteBookingConfirmSheet
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

      {noShowBooking ? (
        <NoShowReasonSheet
          error={actionError}
          isSubmitting={isActionSubmitting}
          onClose={() => {
            setNoShowBooking(null)
            setActionError(null)
          }}
          onSubmit={handleNoShowBooking}
        />
      ) : null}
    </div>
  )
}
