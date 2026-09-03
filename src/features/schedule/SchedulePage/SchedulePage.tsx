import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import {
  getApiErrorCode,
  getApiErrorDetails,
  getApiErrorMessage,
  getApiFieldErrors,
  isApiClientError,
} from '../../../core/api/apiError.helpers'
import type { ApiFieldError } from '../../../core/api/apiClient'
import { bookingStatusCopy } from '../../../shared/copy/appCopy'
import {
  canChooseOperationalCourt,
  getAssignedOperationalCourtId,
  type CurrentUserMembershipClub,
  type CurrentUserMembershipCourt,
} from '../../../core/auth/auth.types'
import { useAuth } from '../../../core/auth/useAuth'
import { AppDateNavigator } from '../../../shared/components/AppDateNavigator/AppDateNavigator'
import { AppButton } from '../../../shared/components/AppButton/AppButton'
import {
  formatArabicDateWithWeekday,
  formatDateInputValue,
} from '../../../shared/utils/date'
import { listCourts } from '../../courts/courtsApi'
import type { Court } from '../../courts/courts.types'
import {
  AddBookingSheet,
  type AddBookingSheetValues,
} from '../components/AddBookingSheet/AddBookingSheet'
import { BookingCard } from '../components/BookingCard/BookingCard'
import {
  CancelBookingReasonSheet,
  type CancelBookingReasonValues,
} from '../components/CancelBookingReasonSheet/CancelBookingReasonSheet'
import { CompleteBookingConfirmSheet } from '../components/CompleteBookingConfirmSheet/CompleteBookingConfirmSheet'
import {
  NoShowReasonSheet,
  type NoShowReasonValues,
} from '../components/NoShowReasonSheet/NoShowReasonSheet'
import { ScheduleClosingSection } from '../components/ScheduleClosingSection/ScheduleClosingSection'
import { ScheduleSummary } from '../components/ScheduleSummary/ScheduleSummary'
import { VirtualRecurringSlotDetailsSheet } from '../components/VirtualRecurringSlotDetailsSheet/VirtualRecurringSlotDetailsSheet'
import { BookingActionSheet } from '../../bookings/components/BookingActionSheet/BookingActionSheet'
import { EditBookingDetailsSheet } from '../../bookings/components/EditBookingDetailsSheet/EditBookingDetailsSheet'
import { RescheduleBookingSheet } from '../../bookings/components/RescheduleBookingSheet/RescheduleBookingSheet'
import { hasActiveRecurrence, shouldRefreshRecurrencePreview } from '../../bookings/bookingRecurrence.helpers'
import { createTransaction } from '../../transactions/transactionsApi'
import { notifyCurrentFinancialStateChanged } from '../../settlements/currentFinancialStateInvalidation'
import {
  RecordPaymentSheet,
  type RecordPaymentSheetValues,
} from '../../transactions/components/RecordPaymentSheet/RecordPaymentSheet'
import {
  formatBookingDateTime,
  formatTime12Hour,
  getBookingSummariesFromScheduleSlots,
  getScheduleClosingBookings,
  mapBookingSlotsResponseToScheduleBookings,
} from '../scheduleBoard.helpers'
import type { ScheduleBooking } from '../schedule.types'
import {
  cancelBooking,
  completeBooking,
  createBooking,
  endBookingRecurrence,
  getBooking,
  listBookingSlots,
  markBookingNoShow,
  previewBookingCancellation,
  rescheduleBooking,
  updateBookingCustomer,
} from '../scheduleApi'
import {
  BOOKING_COMPLETION_REQUIRES_FULL_PAYMENT,
  type BookingCompletePayload,
  type BookingCancellationPreview,
  type BookingCustomerUpdatePayload,
  type BookingListItem,
  type BookingReschedulePayload,
} from '../scheduleApi.types'
import { AppSelect } from '../../../shared/components/AppSelect/AppSelect'
import { AppCard } from '../../../shared/components/AppCard/AppCard'
import { AppSuccessNotice } from '../../../shared/components/AppSuccessNotice/AppSuccessNotice'
import { useOfflineSync } from '../../../offline/sync/offlineSyncContext'
import { createOfflineScopeKey } from '../../../offline/scope/offlineScope'
import { offlineRepositories } from '../../../offline/repositories/offlineRepositories'
import type {
  BookingIntentRecord,
  ScheduleDayRecord,
} from '../../../offline/offline.types'
import {
  ACTIVE_BOOKING_INTENT_STATUSES,
  findExactBookingIntentSlot,
  getBookingIntentStatusLabel,
  getSlotWallTime,
  isAuthoritativeFreeSlot,
  rankBookingIntentAlternatives,
  recheckBookingIntentsForScheduleCourts,
} from '../../../offline/bookings/bookingIntentRecheck'
import { setPreferredScheduleCourt } from '../../../offline/schedule/scheduleSyncPreference'
import {
  getScheduleSyncWindow,
  isDateInsideScheduleSyncWindow,
} from '../../../offline/schedule/scheduleSyncWindow'
import { getScheduleFreshnessLabel } from '../../../offline/schedule/scheduleFreshness'

const BOOKING_CANCELLATION_TIME_PASSED = 'BOOKING_CANCELLATION_TIME_PASSED'
const FIRST_PAYMENT_BELOW_MINIMUM_DEPOSIT = 'FIRST_PAYMENT_BELOW_MINIMUM_DEPOSIT'
const ONLINE_REQUIRED_MESSAGE = 'يحتاج اتصال بالإنترنت'

function getScheduleRequestKey(
  clubSlug: string,
  courtId: number,
  date: string,
): string {
  return [clubSlug, courtId, date].join(':')
}

const statusLegend = [
  {
    label: 'متاح',
    className: 'border-[#22C55E] bg-white',
  },
  {
    label: 'بانتظار العربون',
    className: 'border-amber-400 bg-amber-100',
  },
  {
    label: bookingStatusCopy.CONFIRMED,
    className: 'sloty-green-surface-button border-[var(--sloty-primary-dark)]',
  },
  {
    label: bookingStatusCopy.COMPLETED,
    className: 'border-slate-400 bg-slate-200',
  },
  {
    label: 'عدم حضور',
    className: 'border-rose-300 bg-rose-100',
  },
]

const schedulePeriodStyles = {
  am: {
    section:
      'border-amber-100/90 bg-[#FFF7DF]/92 shadow-amber-950/10 ring-1 ring-white/75',
    header:
      'border-amber-200/80 bg-white/70 text-amber-950 shadow-amber-950/5',
    kicker: 'text-amber-700',
  },
  pm: {
    section:
      'border-slate-500/70 bg-slate-900/72 shadow-slate-950/30 ring-1 ring-white/10',
    header:
      'border-slate-500/60 bg-slate-950/45 text-white shadow-slate-950/20',
    kicker: 'text-slate-200',
  },
} as const

const bookingConflictCodes = new Set([
  'BOOKING_SLOT_UNAVAILABLE',
  'BOOKING_SLOT_ALREADY_TAKEN',
  'BOOKING_OVERLAP',
])

interface VisibleBookingIntentAlternative {
  courtId: number
  courtName: string
  date: string
  startTime: string
  endTime: string
}

function getSummary(slots: ScheduleBooking[]) {
  return {
    availableCount: slots.filter((slot) => slot.status === 'available').length,
    confirmedCount: slots.filter((slot) => slot.status === 'confirmed').length,
    totalSlots: slots.length,
  }
}

function getCourtMinimumDeposit(
  court: Court | CurrentUserMembershipCourt | null,
): string | null {
  if (!court || !('minimum_deposit' in court)) {
    return null
  }

  return typeof court.minimum_deposit === 'string'
    ? court.minimum_deposit
    : null
}

function getIntentStatusTone(status: BookingIntentRecord['status']): string {
  switch (status) {
    case 'READY_TO_BOOK':
      return 'border-emerald-200 bg-emerald-50 text-emerald-900'
    case 'CONFLICT':
      return 'border-rose-200 bg-rose-50 text-rose-900'
    case 'EXPIRED':
      return 'border-slate-200 bg-slate-50 text-slate-700'
    case 'PENDING_RECHECK':
    default:
      return 'border-amber-200 bg-amber-50 text-amber-900'
  }
}

/**
 * Booking Board for court availability and quick manual creation.
 *
 * It uses the backend booking slots endpoint as the schedule authority.
 * FREE slots create manual bookings, while occupied slots open the existing
 * booking action/details surfaces when the backend includes booking details.
 */
export function SchedulePage() {
  const { currentUser, role, selectedClubSlug, selectedMembership } = useAuth()
  const { connectivity, requestSync, sync } = useOfflineSync()
  const location = useLocation()
  const navigate = useNavigate()
  const [selectedDate, setSelectedDate] = useState(formatDateInputValue(new Date()))
  const selectedClub: CurrentUserMembershipClub | null =
    selectedMembership?.club ?? null
  const assignedCourtId = getAssignedOperationalCourtId(
    role,
    selectedMembership,
  )
  const canChooseCourt = canChooseOperationalCourt(role, selectedMembership)
  const [courts, setCourts] = useState<Court[]>([])
  const [selectedCourtId, setSelectedCourtId] = useState<number | null>(null)
  const [slots, setSlots] = useState<ScheduleBooking[]>([])
  const [boardMessage, setBoardMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSetupLoading, setIsSetupLoading] = useState(true)
  const [isSlotsLoading, setIsSlotsLoading] = useState(false)
  const [isSlotsRefreshing, setIsSlotsRefreshing] = useState(false)
  const [scheduleSource, setScheduleSource] = useState<'backend' | 'cache' | null>(null)
  const [cacheSyncedAt, setCacheSyncedAt] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<ScheduleBooking | null>(null)
  const [selectedActionBooking, setSelectedActionBooking] =
    useState<BookingListItem | null>(null)
  const [holdBooking, setHoldBooking] = useState<BookingListItem | null>(null)
  const [isHoldActionSubmitting, setIsHoldActionSubmitting] = useState(false)
  const [holdActionError, setHoldActionError] = useState<string | null>(null)
  const [isCreateSubmitting, setIsCreateSubmitting] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createFieldErrors, setCreateFieldErrors] = useState<Record<
    string,
    ApiFieldError[]
  > | null>(null)
  const [paymentBooking, setPaymentBooking] = useState<BookingListItem | null>(
    null,
  )
  const [isPaymentSubmitting, setIsPaymentSubmitting] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [paymentFieldErrors, setPaymentFieldErrors] = useState<Record<
    string,
    ApiFieldError[]
  > | null>(null)
  const [cancellingBooking, setCancellingBooking] =
    useState<BookingListItem | null>(null)
  const [cancellationPreview, setCancellationPreview] =
    useState<BookingCancellationPreview | null>(null)
  const [completingBooking, setCompletingBooking] =
    useState<BookingListItem | null>(null)
  const [
    completingBookingRemainingAmount,
    setCompletingBookingRemainingAmount,
  ] = useState<string | null>(null)
  const [noShowBooking, setNoShowBooking] = useState<BookingListItem | null>(
    null,
  )
  const [editingBooking, setEditingBooking] = useState<BookingListItem | null>(
    null,
  )
  const [reschedulingBooking, setReschedulingBooking] =
    useState<BookingListItem | null>(null)
  const [isLifecycleSubmitting, setIsLifecycleSubmitting] = useState(false)
  const [lifecycleError, setLifecycleError] = useState<string | null>(null)
  const [lifecycleFieldErrors, setLifecycleFieldErrors] = useState<Record<
    string,
    ApiFieldError[]
  > | null>(null)
  const [bookingIntents, setBookingIntents] = useState<BookingIntentRecord[]>([])
  const [intentError, setIntentError] = useState<string | null>(null)
  const [submittingIntentId, setSubmittingIntentId] = useState<string | null>(
    null,
  )
  const [alternativeIntentId, setAlternativeIntentId] = useState<string | null>(
    null,
  )
  const [alternativeSlots, setAlternativeSlots] = useState<
    VisibleBookingIntentAlternative[]
  >([])
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [settledSlotsDate, setSettledSlotsDate] = useState<string | null>(null)
  const slotsSectionRef = useRef<HTMLElement | null>(null)
  const daySectionRef = useRef<HTMLElement | null>(null)
  const pendingSlotsScrollDateRef = useRef<string | null>(null)
  const requestSyncRef = useRef(requestSync)
  const lastRequestedWindowSyncKeyRef = useRef<string | null>(null)
  const activeScheduleRequestKeyRef = useRef<string | null>(null)

  useEffect(() => {
    requestSyncRef.current = requestSync
  }, [requestSync])

  useEffect(() => {
    const navigationState = location.state as { beginAtDayChoice?: boolean } | null

    if (!navigationState?.beginAtDayChoice) {
      return
    }

    pendingSlotsScrollDateRef.current = null
    daySectionRef.current?.scrollIntoView({ block: 'start' })
    navigate(`${location.pathname}${location.search}`, {
      replace: true,
      state: null,
    })
  }, [location.pathname, location.search, location.state, navigate])

  useEffect(() => {
    if (
      isSlotsLoading ||
      !settledSlotsDate ||
      pendingSlotsScrollDateRef.current !== settledSlotsDate
    ) {
      return
    }

    pendingSlotsScrollDateRef.current = null
    slotsSectionRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }, [isSlotsLoading, settledSlotsDate])
  const assignedCourt = useMemo(
    () =>
      selectedMembership?.court
        ? {
            id: selectedMembership.court.id,
            name: selectedMembership.court.name,
          }
        : null,
    [selectedMembership],
  )
  const selectedCourt = canChooseCourt
    ? courts.find((court) => court.id === selectedCourtId) ?? null
    : assignedCourt
  const authorizedIntentCourtIds = useMemo(() => {
    if (!canChooseCourt) {
      return assignedCourtId ? [assignedCourtId] : []
    }

    return courts.map((court) => court.id)
  }, [assignedCourtId, canChooseCourt, courts])
  const offlineScope = useMemo(
    () =>
      currentUser && selectedClubSlug
        ? { userId: currentUser.id, clubSlug: selectedClubSlug }
        : null,
    [currentUser, selectedClubSlug],
  )
  const offlineScopeKey = offlineScope
    ? createOfflineScopeKey(offlineScope)
    : null
  const amSlots = slots.filter((booking) => booking.period === 'am')
  const pmSlots = slots.filter((booking) => booking.period === 'pm')
  const summary = getSummary(slots)
  const bookingSummaries = getBookingSummariesFromScheduleSlots(slots)
  const closingBookings = getScheduleClosingBookings(
    bookingSummaries,
    selectedDate,
  )
  const isOfflineLike =
    connectivity.browserNetwork === 'offline' ||
    connectivity.backendReachability === 'unreachable'
  const freshness = getScheduleFreshnessLabel(cacheSyncedAt)

  function applyScheduleResponse(
    response: {
      court: number
      court_name: string
      date_from: string
      date_to: string
      slot_duration_minutes: number
      message?: string | null
      slots: Parameters<typeof mapBookingSlotsResponseToScheduleBookings>[0]['slots']
    },
    source: 'backend' | 'cache',
    syncedAt: string | null,
  ): void {
    setSlots(mapBookingSlotsResponseToScheduleBookings(response))
    setBoardMessage(
      response.slots.length === 0
        ? response.message || 'مفيش مواعيد متاحة في اليوم ده.'
        : null,
    )
    setScheduleSource(source)
    setCacheSyncedAt(syncedAt)
  }

  function canAttemptNetworkRequest(): boolean {
    return connectivity.browserNetwork !== 'offline'
  }

  function shouldTreatAsConnectivityFailure(error: unknown): boolean {
    return isApiClientError(error) && error.code === 'NETWORK_ERROR'
  }

  function requireOnlineAction(setActionError: (message: string) => void): boolean {
    if (!isOfflineLike) {
      return true
    }

    setActionError(ONLINE_REQUIRED_MESSAGE)
    return false
  }

  function cacheBookingDetail(booking: BookingListItem): void {
    if (!offlineScope) {
      return
    }

    void offlineRepositories.saveBookingDetail(
      offlineScope,
      booking,
      new Date().toISOString(),
    )
  }

  function getCourtName(courtId: number): string {
    if (selectedCourt?.id === courtId) {
      return selectedCourt.name
    }

    return (
      courts.find((court) => court.id === courtId)?.name ??
      (assignedCourt?.id === courtId ? assignedCourt.name : null) ??
      `ملعب #${courtId}`
    )
  }

  function createLocalIntentId(): string {
    return typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `intent-${Date.now()}-${Math.random().toString(36).slice(2)}`
  }

  async function loadActiveBookingIntents(): Promise<BookingIntentRecord[]> {
    if (!offlineScope || authorizedIntentCourtIds.length === 0) {
      setBookingIntents([])
      return []
    }

    const intents = await offlineRepositories.getBookingIntentsForCourts(
      offlineScope,
      authorizedIntentCourtIds,
    )
    const activeIntents = intents
      .filter((intent) => ACTIVE_BOOKING_INTENT_STATUSES.includes(intent.status))
      .sort((firstIntent, secondIntent) => {
        const priority = {
          CONFLICT: 0,
          READY_TO_BOOK: 1,
          PENDING_RECHECK: 2,
          EXPIRED: 3,
          BOOKED: 4,
          DISMISSED: 5,
        } satisfies Record<BookingIntentRecord['status'], number>
        const priorityDifference =
          priority[firstIntent.status] - priority[secondIntent.status]

        if (priorityDifference !== 0) {
          return priorityDifference
        }

        return secondIntent.created_at.localeCompare(firstIntent.created_at)
      })

    setBookingIntents(activeIntents)
    return activeIntents
  }

  async function loadScheduleDaysForIntentAlternatives(
    intent: BookingIntentRecord,
  ) {
    if (!offlineScope) {
      return []
    }

    const candidateCourtIds =
      authorizedIntentCourtIds.length > 0
        ? authorizedIntentCourtIds
        : [intent.court_id]
    const days = await Promise.all(
      candidateCourtIds.map((courtId) =>
        offlineRepositories.readScheduleDay(
          offlineScope,
          courtId,
          intent.requested_date,
        ),
      ),
    )

    return days.filter((day): day is ScheduleDayRecord => Boolean(day))
  }

  async function refreshBookingIntentClassifications(
    courtIds = authorizedIntentCourtIds,
  ): Promise<void> {
    if (!offlineScope || courtIds.length === 0) {
      return
    }

    await recheckBookingIntentsForScheduleCourts({
      courtIds,
      scope: offlineScope,
    })
    await loadActiveBookingIntents()
  }

  async function loadAuthoritativeBookingDetail(
    bookingId: number,
  ): Promise<BookingListItem> {
    if (!selectedClubSlug) {
      throw new Error('Booking detail requires a selected Club.')
    }

    const freshBooking = await getBooking(selectedClubSlug, bookingId)
    cacheBookingDetail(freshBooking)

    return freshBooking
  }

  function getOfflineDateBoundaryMessage(dateValue: string): string {
    const window = getScheduleSyncWindow()

    return dateValue > window.dateTo
      ? 'المواعيد بعد التاريخ ده محتاجة إنترنت علشان تتعرض.'
      : 'المواعيد قبل التاريخ ده محتاجة إنترنت علشان تتعرض.'
  }

  function requestWindowSyncIfNeeded(): void {
    if (!offlineScopeKey || !selectedCourt || !canAttemptNetworkRequest()) {
      return
    }

    const window = getScheduleSyncWindow()
    const syncKey = [
      offlineScopeKey,
      selectedCourt.id,
      window.dateFrom,
      window.dateTo,
    ].join(':')

    if (
      lastRequestedWindowSyncKeyRef.current === syncKey ||
      sync.status === 'syncing'
    ) {
      return
    }

    lastRequestedWindowSyncKeyRef.current = syncKey
    void requestSyncRef.current().catch(() => {
      // The coordinator exposes failure through `sync`; cached data remains visible.
    })
  }

  async function fetchAuthoritativeScheduleDay(options: {
    persistIfInsideWindow: boolean
    requestKey?: string
    showLoading: boolean
  }): Promise<boolean> {
    if (!selectedClubSlug || !selectedCourt) {
      return false
    }

    const clubSlug = selectedClubSlug
    const courtId = selectedCourt.id
    const date = selectedDate

    if (options.showLoading) {
      setIsSlotsLoading(true)
    } else {
      setIsSlotsRefreshing(true)
    }
    setError(null)

    try {
      const response = await listBookingSlots(clubSlug, {
        court: courtId,
        date,
      })
      const syncedAt = new Date().toISOString()

      if (
        options.requestKey &&
        activeScheduleRequestKeyRef.current !== options.requestKey
      ) {
        return false
      }

      applyScheduleResponse(response, 'backend', null)

      if (
        options.persistIfInsideWindow &&
        offlineScope &&
        isDateInsideScheduleSyncWindow(date)
      ) {
        await offlineRepositories.replaceScheduleDay(
          offlineScope,
          courtId,
          date,
          response.slots,
          syncedAt,
          response.message ?? null,
        )
      }

      setSettledSlotsDate(date)
      return true
    } catch (error) {
      if (
        options.requestKey &&
        activeScheduleRequestKeyRef.current !== options.requestKey
      ) {
        return false
      }

      if (scheduleSource === 'cache' && shouldTreatAsConnectivityFailure(error)) {
        setError(null)
      } else {
        setSlots([])
        setBoardMessage(null)
        setScheduleSource(null)
        setCacheSyncedAt(null)
        setError(getApiErrorMessage(error, 'تعذر تحميل مواعيد اليوم'))
      }
      setSettledSlotsDate(date)
      return false
    } finally {
      if (options.showLoading) {
        setIsSlotsLoading(false)
      } else {
        setIsSlotsRefreshing(false)
      }
    }
  }

  async function refreshIntentScheduleDay(
    courtId: number,
    date: string,
  ): Promise<void> {
    if (!selectedClubSlug || !offlineScope) {
      return
    }

    const response = await listBookingSlots(selectedClubSlug, {
      court: courtId,
      date,
    })

    if (isDateInsideScheduleSyncWindow(date)) {
      await offlineRepositories.replaceScheduleDay(
        offlineScope,
        courtId,
        date,
        response.slots,
        new Date().toISOString(),
        response.message ?? null,
      )
    }

    if (selectedCourt?.id === courtId && selectedDate === date) {
      applyScheduleResponse(response, 'backend', null)
      setSettledSlotsDate(date)
    }
  }

  useEffect(() => {
    let isActive = true

    async function loadSetup(): Promise<void> {
      if (!selectedClubSlug || !selectedClub) {
        setCourts([])
        setSelectedCourtId(null)
        setSlots([])
        setBoardMessage('اختر ناديًا أولًا لعرض الجدول')
        setError(null)
        setIsSetupLoading(false)
        return
      }

      setIsSetupLoading(true)
      setError(null)
      setBoardMessage(null)

      if (!canChooseCourt) {
        if (isActive) {
          setCourts([])
          setSelectedCourtId(assignedCourtId)
          setSlots([])
          setBoardMessage(
            assignedCourtId ? null : 'لا يوجد ملعب مخصص لهذا المستخدم',
          )
          setIsSetupLoading(false)
        }
        return
      }

      try {
        const courtsResponse = await listCourts(selectedClubSlug)
        const activeCourts = courtsResponse.results.filter(
          (court) => court.is_active,
        )
        const firstActiveCourt = activeCourts[0] ?? null

        if (isActive) {
          setCourts(activeCourts)
          setSelectedCourtId(firstActiveCourt?.id ?? null)
          const message = firstActiveCourt
            ? null
            : 'لا توجد ملاعب نشطة لعرض جدول الحجز'

          setBoardMessage(message)
        }
      } catch (error) {
        if (isActive) {
          setError(
            getApiErrorMessage(error, 'تعذر تحميل إعدادات جدول الحجز'),
          )
        }
      } finally {
        if (isActive) {
          setIsSetupLoading(false)
        }
      }
    }

    void loadSetup()

    return () => {
      isActive = false
    }
  }, [assignedCourtId, canChooseCourt, selectedClub, selectedClubSlug])

  async function reloadScheduleSlots(): Promise<void> {
    if (!selectedClubSlug || !selectedCourt) {
      setSlots([])
      setBoardMessage(
        selectedClubSlug
          ? 'اختر ملعبًا لعرض الجدول'
          : 'اختر ناديًا أولًا لعرض الجدول',
      )
      return
    }

    await fetchAuthoritativeScheduleDay({
      persistIfInsideWindow: true,
      showLoading: true,
    })
  }

  useEffect(() => {
    if (!selectedClubSlug || !selectedCourt) {
      queueMicrotask(() => {
        setSlots([])
        setBoardMessage(
          selectedClubSlug
            ? 'اختر ملعبًا لعرض الجدول'
            : 'اختر ناديًا أولًا لعرض الجدول',
        )
      })
      return
    }

    let isActive = true
    const courtId = selectedCourt.id
    const date = selectedDate
    const requestKey = getScheduleRequestKey(
      selectedClubSlug,
      courtId,
      date,
    )
    const courtName = selectedCourt.name
    const scope = offlineScope
    const isInsideWindow = isDateInsideScheduleSyncWindow(date)

    async function loadSlots(): Promise<void> {
      activeScheduleRequestKeyRef.current = requestKey
      setError(null)
      setIsSlotsLoading(false)
      setIsSlotsRefreshing(false)

      if (offlineScopeKey) {
        setPreferredScheduleCourt(offlineScopeKey, courtId)
      }

      if (scope && isInsideWindow) {
        const cachedDay = await offlineRepositories.readScheduleDay(
          scope,
          courtId,
          date,
        )

        if (!isActive) {
          return
        }

        if (cachedDay) {
          applyScheduleResponse(
            {
              court: courtId,
              court_name: courtName,
              date_from: date,
              date_to: date,
              slot_duration_minutes: 0,
              message: cachedDay.message,
              slots: cachedDay.slots,
            },
            'cache',
            cachedDay.synced_at,
          )
          setSettledSlotsDate(date)
          requestWindowSyncIfNeeded()
          return
        }
      }

      setScheduleSource(null)
      setCacheSyncedAt(null)

      if (!isInsideWindow && !canAttemptNetworkRequest()) {
        setSlots([])
        setBoardMessage(getOfflineDateBoundaryMessage(date))
        setSettledSlotsDate(date)
        return
      }

      if (isInsideWindow && !canAttemptNetworkRequest()) {
        setSlots([])
        setBoardMessage(
          'محتاج اتصال بالإنترنت أول مرة\nاتصل بالإنترنت علشان نحمل مواعيد الملعب ونجهزها للاستخدام بدون إنترنت.',
        )
        setSettledSlotsDate(date)
        return
      }

      if (
        isInsideWindow &&
        sync.status === 'syncing' &&
        sync.activeDataset === 'schedule'
      ) {
        setIsSlotsLoading(true)
        setBoardMessage(null)
        return
      }

      setIsSlotsLoading(true)
      setError(null)

      const didLoad = await fetchAuthoritativeScheduleDay({
        persistIfInsideWindow: isInsideWindow,
        requestKey,
        showLoading: true,
      })

      if (!isActive) {
        return
      }

      if (didLoad && isInsideWindow) {
        requestWindowSyncIfNeeded()
      }
    }

    void loadSlots()

    return () => {
      isActive = false
    }
  // The concrete schedule inputs below intentionally drive this effect. The
  // network-refresh callbacks read through refs/guards so a DB write does not
  // trigger an equivalent sync loop.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedClubSlug,
    selectedCourt,
    selectedDate,
    offlineScope,
    offlineScopeKey,
    connectivity.browserNetwork,
    connectivity.backendReachability,
    sync.status,
    sync.activeDataset,
    sync.lastRunCompletedAt,
  ])

  useEffect(() => {
    let isActive = true

    async function loadIntents(): Promise<void> {
      if (!offlineScope || authorizedIntentCourtIds.length === 0) {
        setBookingIntents([])
        return
      }

      try {
        const intents = await offlineRepositories.getBookingIntentsForCourts(
          offlineScope,
          authorizedIntentCourtIds,
        )

        if (!isActive) {
          return
        }

        setBookingIntents(
          intents
            .filter((intent) =>
              ACTIVE_BOOKING_INTENT_STATUSES.includes(intent.status),
            )
            .sort((firstIntent, secondIntent) =>
              secondIntent.created_at.localeCompare(firstIntent.created_at),
            ),
        )
      } catch {
        if (isActive) {
          setIntentError('تعذر تحميل طلبات الحجز المحفوظة.')
        }
      }
    }

    void loadIntents()

    return () => {
      isActive = false
    }
  }, [authorizedIntentCourtIds, offlineScope, sync.lastRunCompletedAt])

  useEffect(() => {
    if (!selectedSlot || !selectedCourt || selectedSlot.date !== selectedDate) {
      return
    }

    const matchingSlot = slots.find(
      (slot) =>
        slot.date === selectedSlot.date &&
        slot.startTime === selectedSlot.startTime &&
        slot.endTime === selectedSlot.endTime &&
        (slot.booking?.id ?? null) === (selectedSlot.booking?.id ?? null),
    )

    if (!matchingSlot) {
      return
    }

    if (
      matchingSlot.status !== selectedSlot.status ||
      matchingSlot.isAvailable !== selectedSlot.isAvailable
    ) {
      queueMicrotask(() => {
        setSelectedSlot(matchingSlot)
        if (matchingSlot.booking) {
          const freshBooking = matchingSlot.booking

          setSelectedActionBooking((current) =>
            current?.id === freshBooking.id
              ? freshBooking
              : current,
          )
          setHoldBooking((current) =>
            current?.id === freshBooking.id
              ? freshBooking
              : current,
          )
        } else {
          setSelectedActionBooking(null)
          setHoldBooking(null)
        }
      })
    }
  }, [selectedCourt, selectedDate, selectedSlot, slots])

  async function handleManualScheduleRetry(): Promise<void> {
    if (!canAttemptNetworkRequest()) {
      setBoardMessage(
        'محتاج اتصال بالإنترنت أول مرة\nاتصل بالإنترنت علشان نحمل مواعيد الملعب ونجهزها للاستخدام بدون إنترنت.',
      )
      return
    }

    setIsSlotsLoading(true)
    setError(null)

    try {
      await requestSyncRef.current()

      if (offlineScope && selectedCourt) {
        const cachedDay = await offlineRepositories.readScheduleDay(
          offlineScope,
          selectedCourt.id,
          selectedDate,
        )

        if (cachedDay) {
          applyScheduleResponse(
            {
              court: selectedCourt.id,
              court_name: selectedCourt.name,
              date_from: selectedDate,
              date_to: selectedDate,
              slot_duration_minutes: 0,
              message: cachedDay.message,
              slots: cachedDay.slots,
            },
            'cache',
            cachedDay.synced_at,
          )
          setSettledSlotsDate(selectedDate)
          return
        }
      }

      await fetchAuthoritativeScheduleDay({
        persistIfInsideWindow: isDateInsideScheduleSyncWindow(selectedDate),
        showLoading: true,
      })
    } catch {
      setError('تعذر تحديث المواعيد. حاول مرة أخرى.')
    } finally {
      setIsSlotsLoading(false)
    }
  }

  async function handleCreateBooking(
    values: AddBookingSheetValues,
  ): Promise<void> {
    if (!selectedClubSlug || !selectedCourt || !selectedSlot) {
      return
    }

    setIsCreateSubmitting(true)
    setCreateError(null)
    setCreateFieldErrors(null)

    try {
      const startTime = formatBookingDateTime(selectedDate, selectedSlot.startTime)
      const endTime = formatBookingDateTime(selectedDate, selectedSlot.endTime)

      if (isOfflineLike) {
        if (!offlineScope) {
          setCreateError(ONLINE_REQUIRED_MESSAGE)
          return
        }

        await offlineRepositories.saveBookingIntent(offlineScope, {
          local_id: createLocalIntentId(),
          court_id: selectedCourt.id,
          requested_date: selectedDate,
          requested_start: startTime,
          requested_end: endTime,
          customer_name: values.customer_name,
          customer_phone: values.customer_phone,
          notes: values.notes ?? null,
          original_slot_snapshot: {
            date: selectedDate,
            start_time: startTime,
            end_time: endTime,
            slot_status: 'FREE',
            is_available: true,
            slot_price: selectedSlot.slotPrice ?? null,
            booking: null,
            recurring_anchor_booking_id:
              selectedSlot.recurringAnchorBookingId ?? null,
            recurring_context: selectedSlot.recurringContext ?? null,
            can_start_recurring: selectedSlot.canStartRecurring ?? null,
            recurring_blocked_reason:
              selectedSlot.recurringBlockedReason ?? null,
            first_recurring_conflict_start:
              selectedSlot.firstRecurringConflictStart ?? null,
            label: selectedSlot.label ?? 'متاح',
          },
          status: 'PENDING_RECHECK',
          created_at: new Date().toISOString(),
          last_checked_at: null,
          resolved_booking_id: null,
        })

        setSelectedSlot(null)
        await loadActiveBookingIntents()
        setSuccessMessage('✓ تم حفظ طلب الحجز')
        return
      }

      await createBooking(selectedClubSlug, {
        court: selectedCourt.id,
        customer_name: values.customer_name,
        customer_phone: values.customer_phone,
        start_time: startTime,
        end_time: endTime,
        is_recurring: values.is_recurring,
        ...(values.notes ? { notes: values.notes } : {}),
      })

      setSelectedSlot(null)
      await reloadScheduleSlots()
      setSuccessMessage('✓ تم حجز الموعد بنجاح')
    } catch (error) {
      const errorCode = getApiErrorCode(error)

      setCreateError(
        getApiErrorMessage(
          error,
          'تعذر إنشاء الحجز. تأكد من البيانات وحاول مرة أخرى',
        ),
      )
      setCreateFieldErrors(getApiFieldErrors(error))

      if (errorCode && bookingConflictCodes.has(errorCode)) {
        await reloadScheduleSlots()
      }
    } finally {
      setIsCreateSubmitting(false)
    }
  }

  async function handleDismissBookingIntent(localId: string): Promise<void> {
    if (!offlineScope) {
      return
    }

    setIntentError(null)
    await offlineRepositories.updateBookingIntentStatus(
      offlineScope,
      localId,
      'DISMISSED',
    )
    setAlternativeIntentId(null)
    setAlternativeSlots([])
    await loadActiveBookingIntents()
  }

  async function handleShowAlternativeSlots(
    intent: BookingIntentRecord,
  ): Promise<void> {
    setIntentError(null)
    setAlternativeIntentId(intent.local_id)

    try {
      const scheduleDays = await loadScheduleDaysForIntentAlternatives(intent)
      const rankedAlternatives = rankBookingIntentAlternatives(
        intent,
        scheduleDays,
      )

      setAlternativeSlots(
        rankedAlternatives.slice(0, 8).map((alternative) => ({
          courtId: alternative.courtId,
          courtName: getCourtName(alternative.courtId),
          date: alternative.date,
          startTime: alternative.startTime,
          endTime: alternative.endTime,
        })),
      )
    } catch {
      setIntentError('تعذر تحميل المواعيد البديلة المحفوظة.')
      setAlternativeSlots([])
    }
  }

  async function handleSelectAlternativeSlot(
    intent: BookingIntentRecord,
    alternative: VisibleBookingIntentAlternative,
  ): Promise<void> {
    if (!offlineScope) {
      return
    }

    const cachedDay = await offlineRepositories.readScheduleDay(
      offlineScope,
      alternative.courtId,
      alternative.date,
    )

    if (!cachedDay) {
      setIntentError('لازم تحديث جدول المواعيد قبل اختيار معاد بديل.')
      return
    }

    const latestSlot = findExactBookingIntentSlot(
      {
        court_id: alternative.courtId,
        requested_date: alternative.date,
        requested_start: alternative.startTime,
        requested_end: alternative.endTime,
      },
      cachedDay,
    )
    const nextStatus =
      latestSlot !== null && isAuthoritativeFreeSlot(latestSlot)
        ? 'READY_TO_BOOK'
        : 'CONFLICT'
    const checkedAt = new Date().toISOString()

    await offlineRepositories.updateBookingIntent(offlineScope, intent.local_id, {
      court_id: alternative.courtId,
      requested_date: alternative.date,
      requested_start: formatBookingDateTime(
        alternative.date,
        alternative.startTime,
      ),
      requested_end: formatBookingDateTime(alternative.date, alternative.endTime),
      status: nextStatus,
      last_checked_at: checkedAt,
    })
    setAlternativeIntentId(null)
    setAlternativeSlots([])
    await loadActiveBookingIntents()
  }

  async function handleBookIntent(intent: BookingIntentRecord): Promise<void> {
    if (!selectedClubSlug || !offlineScope) {
      return
    }

    if (!requireOnlineAction(setIntentError)) {
      return
    }

    setSubmittingIntentId(intent.local_id)
    setIntentError(null)

    try {
      const cachedDay = await offlineRepositories.readScheduleDay(
        offlineScope,
        intent.court_id,
        intent.requested_date,
      )
      const latestSlot = cachedDay
        ? findExactBookingIntentSlot(intent, cachedDay)
        : null

      if (!cachedDay) {
        setIntentError('لازم تحديث جدول المواعيد قبل الحجز.')
        return
      }

      if (latestSlot === null || !isAuthoritativeFreeSlot(latestSlot)) {
        await offlineRepositories.updateBookingIntentStatus(
          offlineScope,
          intent.local_id,
          'CONFLICT',
          { lastCheckedAt: new Date().toISOString() },
        )
        await loadActiveBookingIntents()
        return
      }

      const booking = await createBooking(selectedClubSlug, {
        court: intent.court_id,
        customer_name: intent.customer_name,
        customer_phone: intent.customer_phone,
        start_time: formatBookingDateTime(
          intent.requested_date,
          getSlotWallTime(latestSlot.start_time),
        ),
        end_time: formatBookingDateTime(
          intent.requested_date,
          getSlotWallTime(latestSlot.end_time),
        ),
        is_recurring: false,
        ...(intent.notes ? { notes: intent.notes } : {}),
      })

      await offlineRepositories.updateBookingIntentStatus(
        offlineScope,
        intent.local_id,
        'BOOKED',
        {
          lastCheckedAt: new Date().toISOString(),
          resolvedBookingId: booking.id,
        },
      )
      setAlternativeIntentId(null)
      setAlternativeSlots([])
      await refreshIntentScheduleDay(intent.court_id, intent.requested_date)
      await refreshBookingIntentClassifications([intent.court_id])
      await loadActiveBookingIntents()
      setSuccessMessage('✓ تم حجز الموعد بنجاح')
    } catch (error) {
      const errorCode = getApiErrorCode(error)

      if (errorCode && bookingConflictCodes.has(errorCode)) {
        await offlineRepositories.updateBookingIntentStatus(
          offlineScope,
          intent.local_id,
          'CONFLICT',
          { lastCheckedAt: new Date().toISOString() },
        )
        await refreshIntentScheduleDay(intent.court_id, intent.requested_date)
        await loadActiveBookingIntents()
        setIntentError('المعاد مبقاش متاح. اختار معاد تاني.')
      } else {
        setIntentError(
          getApiErrorMessage(
            error,
            'تعذر إكمال الحجز الآن. الطلب محفوظ وتقدر تحاول تاني.',
          ),
        )
      }
    } finally {
      setSubmittingIntentId(null)
    }
  }

  async function handleCancelBooking(
    values: CancelBookingReasonValues,
  ): Promise<void> {
    if (!selectedClubSlug || !selectedCourt || !cancellingBooking) {
      return
    }

    if (!requireOnlineAction(setLifecycleError)) {
      return
    }

    setIsLifecycleSubmitting(true)
    setLifecycleError(null)
    setLifecycleFieldErrors(null)

    try {
      await cancelBooking(selectedClubSlug, cancellingBooking.id, values)
      setCancellingBooking(null)
      setCancellationPreview(null)
      setSelectedActionBooking(null)
      setSelectedSlot(null)
      notifyCurrentFinancialStateChanged({
        clubSlug: selectedClubSlug,
        reason: 'booking-cancellation',
      })
      await reloadScheduleSlots()
    } catch (error) {
      if (getApiErrorCode(error) === BOOKING_CANCELLATION_TIME_PASSED) {
        setLifecycleError('انتهى وقت إلغاء هذا الحجز لأنه بدأ بالفعل.')
        await reloadScheduleSlots()
      } else {
        setLifecycleError(
          getApiErrorMessage(error, 'تعذر إلغاء الحجز. حاول مرة أخرى'),
        )
      }
      setLifecycleFieldErrors(getApiFieldErrors(error))
    } finally {
      setIsLifecycleSubmitting(false)
    }
  }

  async function handleRequestCancelBooking(
    booking: BookingListItem,
  ): Promise<void> {
    if (!selectedClubSlug) {
      return
    }

    if (!requireOnlineAction(setLifecycleError)) {
      return
    }

    setIsLifecycleSubmitting(true)
    setLifecycleError(null)
    setLifecycleFieldErrors(null)
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
        setLifecycleError('انتهى وقت إلغاء هذا الحجز لأنه بدأ بالفعل.')
        await reloadScheduleSlots()
      } else {
        setLifecycleError(
          getApiErrorMessage(error, 'تعذر معاينة إلغاء الحجز. حاول مرة أخرى'),
        )
      }
      setLifecycleFieldErrors(getApiFieldErrors(error))
    } finally {
      setIsLifecycleSubmitting(false)
    }
  }

  async function handleCompleteBooking(
    payload?: BookingCompletePayload,
  ): Promise<void> {
    if (!selectedClubSlug || !selectedCourt || !completingBooking) {
      return
    }

    if (!requireOnlineAction(setLifecycleError)) {
      return
    }

    setIsLifecycleSubmitting(true)
    setLifecycleError(null)
    setLifecycleFieldErrors(null)

    try {
      if (payload) {
        await completeBooking(selectedClubSlug, completingBooking.id, payload)
      } else {
        await completeBooking(selectedClubSlug, completingBooking.id)
      }
      setCompletingBooking(null)
      setCompletingBookingRemainingAmount(null)
      setSelectedActionBooking(null)
      setSelectedSlot(null)
      await reloadScheduleSlots()
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

      setLifecycleError(
        getApiErrorMessage(error, 'تعذر إكمال الحجز. حاول مرة أخرى'),
      )
      if (shouldRefreshRecurrencePreview(getApiErrorCode(error))) {
        throw error
      }
    } finally {
      setIsLifecycleSubmitting(false)
    }
  }

  async function handleNoShowBooking(
    values: NoShowReasonValues,
  ): Promise<void> {
    if (!selectedClubSlug || !selectedCourt || !noShowBooking) {
      return
    }

    if (!requireOnlineAction(setLifecycleError)) {
      return
    }

    setIsLifecycleSubmitting(true)
    setLifecycleError(null)
    setLifecycleFieldErrors(null)

    try {
      await markBookingNoShow(selectedClubSlug, noShowBooking.id, values)
      setNoShowBooking(null)
      setSelectedActionBooking(null)
      setSelectedSlot(null)
      await reloadScheduleSlots()
    } catch (error) {
      setLifecycleError(
        getApiErrorMessage(error, 'تعذر تسجيل عدم الحضور. حاول مرة أخرى'),
      )
    } finally {
      setIsLifecycleSubmitting(false)
    }
  }

  async function handleEndRecurrence(booking: BookingListItem): Promise<void> {
    if (!selectedClubSlug) {
      return
    }

    if (!requireOnlineAction(setLifecycleError)) {
      return
    }

    setIsLifecycleSubmitting(true)
    setLifecycleError(null)

    try {
      const updatedBooking = await endBookingRecurrence(
        selectedClubSlug,
        booking.id,
      )
      cacheBookingDetail(updatedBooking)
      setSelectedActionBooking(updatedBooking)
      setSelectedSlot(null)
      setSuccessMessage('تم إيقاف الحجز الأسبوعي')
      await reloadScheduleSlots()
    } catch (error) {
      setLifecycleError(
        getApiErrorMessage(error, 'تعذر إيقاف الحجز الأسبوعي. حاول مرة أخرى'),
      )
    } finally {
      setIsLifecycleSubmitting(false)
    }
  }

  async function refreshCanonicalBooking(bookingId: number): Promise<BookingListItem | null> {
    if (!selectedClubSlug) {
      return null
    }

    if (!requireOnlineAction(setLifecycleError)) {
      return null
    }

    const freshBooking = await loadAuthoritativeBookingDetail(bookingId)
    setSelectedActionBooking(freshBooking)
    setHoldBooking((current) =>
      current && current.id === freshBooking.id ? freshBooking : current,
    )
    setSelectedSlot((current) =>
      current?.booking?.id === freshBooking.id
        ? { ...current, booking: freshBooking }
        : current,
    )
    return freshBooking
  }

  async function handleStartEditCustomer(booking: BookingListItem): Promise<void> {
    if (!selectedClubSlug) {
      return
    }

    if (!requireOnlineAction(setLifecycleError)) {
      return
    }

    setIsLifecycleSubmitting(true)
    setLifecycleError(null)

    try {
      const freshBooking = await loadAuthoritativeBookingDetail(booking.id)
      setEditingBooking(freshBooking)
    } catch (error) {
      setLifecycleError(
        getApiErrorMessage(error, 'تعذر تحميل بيانات الحجز. حاول مرة أخرى'),
      )
    } finally {
      setIsLifecycleSubmitting(false)
    }
  }

  async function handleUpdateBookingCustomer(
    payload: BookingCustomerUpdatePayload,
  ): Promise<void> {
    if (!selectedClubSlug || !editingBooking) {
      return
    }

    if (!requireOnlineAction(setLifecycleError)) {
      return
    }

    setIsLifecycleSubmitting(true)
    setLifecycleError(null)
    setLifecycleFieldErrors(null)

    try {
      await updateBookingCustomer(selectedClubSlug, editingBooking.id, payload)
      const freshBooking = await refreshCanonicalBooking(editingBooking.id)
      setEditingBooking(null)
      if (freshBooking) {
        setSelectedActionBooking(freshBooking)
      }
      setSuccessMessage('تم تحديث بيانات الحجز')
      await reloadScheduleSlots()
    } catch (error) {
      setLifecycleError(
        getApiErrorMessage(error, 'تعذر تحديث بيانات الحجز. حاول مرة أخرى'),
      )
      setLifecycleFieldErrors(getApiFieldErrors(error))
    } finally {
      setIsLifecycleSubmitting(false)
    }
  }

  async function handleStartReschedule(booking: BookingListItem): Promise<void> {
    if (!selectedClubSlug) {
      return
    }

    if (!requireOnlineAction(setLifecycleError)) {
      return
    }

    setIsLifecycleSubmitting(true)
    setLifecycleError(null)

    try {
      const freshBooking = await loadAuthoritativeBookingDetail(booking.id)
      setReschedulingBooking(freshBooking)
    } catch (error) {
      setLifecycleError(
        getApiErrorMessage(error, 'تعذر تحميل بيانات الحجز. حاول مرة أخرى'),
      )
    } finally {
      setIsLifecycleSubmitting(false)
    }
  }

  async function handleRescheduleBooking(
    payload: BookingReschedulePayload,
  ): Promise<void> {
    if (!selectedClubSlug || !reschedulingBooking) {
      return
    }

    if (!requireOnlineAction(setLifecycleError)) {
      return
    }

    setIsLifecycleSubmitting(true)
    setLifecycleError(null)
    setLifecycleFieldErrors(null)

    try {
      await rescheduleBooking(selectedClubSlug, reschedulingBooking.id, payload)
      const freshBooking = await refreshCanonicalBooking(reschedulingBooking.id)
      setReschedulingBooking(null)
      setSelectedSlot(null)
      if (freshBooking) {
        setSelectedActionBooking(freshBooking)
      }
      setSuccessMessage('تم تغيير الموعد بنجاح')
      await reloadScheduleSlots()
    } catch (error) {
      setLifecycleError(
        getApiErrorMessage(error, 'تعذر تغيير الموعد. حاول مرة أخرى'),
      )
      setLifecycleFieldErrors(getApiFieldErrors(error))
      throw error
    } finally {
      setIsLifecycleSubmitting(false)
    }
  }

  /**
   * Ends weekly recurrence from a virtual RECURRING_RESERVED slot.
   * Uses the anchor Booking ID only as recurrenceContextBookingId — never as
   * the selected future occurrence Booking ID.
   */
  async function handleEndVirtualRecurrence(
    recurrenceContextBookingId: number,
  ): Promise<void> {
    if (!selectedClubSlug) {
      return
    }

    if (!requireOnlineAction(setLifecycleError)) {
      return
    }

    setIsLifecycleSubmitting(true)
    setLifecycleError(null)

    try {
      await endBookingRecurrence(selectedClubSlug, recurrenceContextBookingId)
      setSelectedSlot(null)
      setSuccessMessage('تم إيقاف الحجز الأسبوعي')
      await reloadScheduleSlots()
    } catch (error) {
      setLifecycleError(
        getApiErrorMessage(error, 'تعذر إيقاف الحجز الأسبوعي. حاول مرة أخرى'),
      )
      await reloadScheduleSlots()

      if (getApiErrorCode(error) === 'BOOKING_RECURRENCE_NOT_ACTIVE') {
        setSelectedSlot(null)
      }
    } finally {
      setIsLifecycleSubmitting(false)
    }
  }

  async function handleRecordPayment(
    values: RecordPaymentSheetValues,
  ): Promise<void> {
    if (!selectedClubSlug || !paymentBooking) {
      return
    }

    if (!requireOnlineAction(setPaymentError)) {
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
      setSelectedActionBooking(null)
      setHoldBooking(null)
      setSelectedSlot(null)
      setSuccessMessage(
        paymentBooking.status === 'HOLD'
          ? 'تم تسجيل العربون وتأكيد الحجز بنجاح'
          : 'تم تسجيل التحصيل بنجاح',
      )
      notifyCurrentFinancialStateChanged({
        clubSlug: selectedClubSlug,
        reason: 'booking-payment',
      })
      await reloadScheduleSlots()
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
    } finally {
      setIsPaymentSubmitting(false)
    }
  }

  async function handleFreeHoldBooking(booking: BookingListItem): Promise<void> {
    if (!selectedClubSlug) {
      return
    }

    if (!requireOnlineAction(setHoldActionError)) {
      return
    }

    setIsHoldActionSubmitting(true)
    setHoldActionError(null)

    try {
      await cancelBooking(selectedClubSlug, booking.id, {
        reason: 'إلغاء الحجز المؤقت',
        notes: 'تم إلغاء الحجز من لوحة الحجز',
      })
      setSelectedActionBooking(null)
      setHoldBooking(null)
      setSelectedSlot(null)
      setSuccessMessage('تم إلغاء الحجز بنجاح')
      await reloadScheduleSlots()
    } catch (error) {
      setHoldActionError(
        getApiErrorMessage(error, 'تعذر إلغاء الحجز. حاول مرة أخرى'),
      )
    } finally {
      setIsHoldActionSubmitting(false)
    }
  }

  async function handleSelectSlot(slot: ScheduleBooking): Promise<void> {
    setSuccessMessage(null)
    setSelectedActionBooking(null)
    setCreateError(null)
    setCreateFieldErrors(null)
    setPaymentError(null)
    setPaymentFieldErrors(null)
    setLifecycleError(null)
    setLifecycleFieldErrors(null)
    setHoldActionError(null)

    // FREE → create booking. Virtual recurrence is an explicit status branch,
    // never inferred from a missing booking summary.
    if (slot.status === 'available' && slot.isAvailable) {
      setSelectedSlot(slot)
      setHoldBooking(null)
      return
    }

    if (slot.status === 'recurring_reserved') {
      setSelectedSlot(slot)
      setHoldBooking(null)
      return
    }

    if (slot.booking) {
      setSelectedSlot(slot)
      setHoldBooking(slot.status === 'hold' ? slot.booking : null)
      return
    }
  }

  function handleSelectClosingBooking(booking: BookingListItem): void {
    setSuccessMessage(null)
    setSelectedSlot(null)
    setSelectedActionBooking(booking)
    setHoldBooking(null)
    setCreateError(null)
    setCreateFieldErrors(null)
    setPaymentError(null)
    setPaymentFieldErrors(null)
    setLifecycleError(null)
    setLifecycleFieldErrors(null)
    setHoldActionError(null)
  }

  function clearScheduleSelection(): void {
    setSelectedSlot(null)
    setSelectedActionBooking(null)
    setHoldBooking(null)
    setPaymentBooking(null)
    setCancellingBooking(null)
    setCancellationPreview(null)
    setCompletingBooking(null)
    setCompletingBookingRemainingAmount(null)
    setNoShowBooking(null)
    setCreateError(null)
    setCreateFieldErrors(null)
    setPaymentError(null)
    setPaymentFieldErrors(null)
    setLifecycleError(null)
    setLifecycleFieldErrors(null)
    setHoldActionError(null)
    setSuccessMessage(null)
  }

  function handleCourtChange(nextCourtId: string): void {
    activeScheduleRequestKeyRef.current = null
    setSelectedCourtId(Number(nextCourtId))
    setSlots([])
    setBoardMessage(null)
    clearScheduleSelection()
  }

  function handleDateChange(nextDate: string): void {
    if (!nextDate || nextDate === selectedDate) {
      return
    }

    pendingSlotsScrollDateRef.current = nextDate
    activeScheduleRequestKeyRef.current = null
    setSelectedDate(nextDate)
    clearScheduleSelection()
  }

  const selectedDateLabel = formatArabicDateWithWeekday(selectedDate)
  const shouldShowBoardSlots =
    !isSetupLoading &&
    !isSlotsLoading &&
    !error &&
    slots.length > 0
  const shouldShowBoardMessage =
    !isSetupLoading &&
    !isSlotsLoading &&
    !error &&
    Boolean(boardMessage) &&
    slots.length === 0
  const loadingMessage = isSetupLoading
    ? 'جاري تحميل إعدادات جدول الحجز...'
    : 'جاري تحميل المواعيد...'

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-7xl flex-col bg-[var(--sloty-bg)]">
      <div className="space-y-4 md:space-y-6">
        <section
          className="space-y-4 rounded-2xl border border-[var(--sloty-border)] bg-[var(--sloty-surface)] p-4 shadow-[var(--sloty-shadow)] md:px-5"
          ref={daySectionRef}
        >
          {canChooseCourt && courts.length > 1 ? (
            <AppSelect
              className="w-full md:w-64"
              label="الملعب"
              onChange={handleCourtChange}
              options={courts.map((court) => ({
                value: String(court.id),
                label: court.name || `ملعب #${court.id}`,
              }))}
              value={selectedCourtId !== null ? String(selectedCourtId) : ''}
            />
          ) : null}

          <div className="space-y-3">
            <h2 className="text-lg font-extrabold text-[var(--sloty-text-primary)]">
              اختار اليوم
            </h2>
            <AppDateNavigator
              onChange={handleDateChange}
              value={selectedDate}
            />
          </div>
        </section>

        <section
          className="scroll-mt-24 space-y-3"
          ref={slotsSectionRef}
        >
          <h2 className="text-lg font-extrabold text-[var(--sloty-text-primary)]">
            اختار المعاد
          </h2>
          {scheduleSource === 'cache' && freshness ? (
            <div
              className={[
                'rounded-2xl border px-3 py-2 text-sm font-bold',
                freshness.tone === 'danger'
                  ? 'border-rose-200 bg-rose-50 text-rose-800'
                  : freshness.tone === 'warning'
                    ? 'border-amber-200 bg-amber-50 text-amber-900'
                    : 'border-emerald-100 bg-emerald-50 text-emerald-900',
              ].join(' ')}
            >
              <p>
                {isOfflineLike ? 'بدون إنترنت · ' : ''}
                {freshness.text}
              </p>
              {isOfflineLike ? (
                <p className="mt-1 text-xs font-semibold">
                  تقدر تكمل باستخدام البيانات المحفوظة.
                </p>
              ) : null}
              {isSlotsRefreshing || sync.activeDataset === 'schedule' ? (
                <p className="mt-1 text-xs font-semibold">
                  جاري تحديث البيانات...
                </p>
              ) : null}
            </div>
          ) : null}
          {lifecycleError &&
          !selectedSlot &&
          !selectedActionBooking &&
          !holdBooking &&
          !cancellingBooking &&
          !completingBooking &&
          !noShowBooking &&
          !editingBooking &&
          !reschedulingBooking ? (
            <p className="rounded-xl bg-[var(--sloty-danger-soft)] px-3 py-2 text-sm font-bold text-[var(--sloty-danger)]">
              {lifecycleError}
            </p>
          ) : null}
          <div
            aria-label="لوحة فترات الملعب"
            className="relative overflow-hidden rounded-[28px] border border-[var(--sloty-border)] bg-cover bg-center shadow-[var(--sloty-shadow)]"
            style={{
              backgroundImage: "url('/images/sloty-court-board-bg.png')",
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/30 via-emerald-900/10 to-slate-950/35" />
            <div className="relative z-10 grid min-h-[560px] grid-cols-1 gap-3 p-2 sm:min-h-[560px] sm:gap-4 sm:p-4 md:min-h-[480px] md:grid-cols-2 md:p-5 lg:min-h-[540px] lg:p-6">
              {isSetupLoading ||
              isSlotsLoading ||
              error ||
              shouldShowBoardMessage ? (
                <div className="flex items-center justify-center rounded-3xl border border-white/20 bg-white/88 p-5 text-center md:col-span-2">
                  <div className="space-y-3">
                    <p className="whitespace-pre-line text-sm font-bold text-[var(--sloty-text-primary)]">
                      {error ??
                        (isSetupLoading || isSlotsLoading
                          ? loadingMessage
                          : boardMessage)}
                    </p>
                    {!error &&
                    !isSetupLoading &&
                    !isSlotsLoading &&
                    boardMessage?.includes('محتاج اتصال بالإنترنت أول مرة') ? (
                      <button
                        className="rounded-full bg-[var(--sloty-primary)] px-4 py-2 text-sm font-extrabold text-white"
                        onClick={() => void handleManualScheduleRetry()}
                        type="button"
                      >
                        حاول مرة تانية
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {shouldShowBoardSlots ? (
                <>
                  <div
                    className={[
                      'flex min-h-0 flex-col justify-between rounded-3xl border p-2 shadow-lg backdrop-blur-[1px] sm:p-3 md:p-4',
                      schedulePeriodStyles.am.section,
                    ].join(' ')}
                    data-testid="schedule-period-am"
                  >
                    <div>
                      <div
                        className={[
                          'mb-3 rounded-2xl border px-3 py-2 shadow-sm',
                          schedulePeriodStyles.am.header,
                        ].join(' ')}
                      >
                        <p
                          className={[
                            'text-xs font-black',
                            schedulePeriodStyles.am.kicker,
                          ].join(' ')}
                        >
                          فترة نهارية
                        </p>
                        <h3 className="text-lg font-black">مواعيد الصباح</h3>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 sm:gap-2 md:grid-cols-3 lg:grid-cols-4">
                      {amSlots.map((booking) => (
                        <BookingCard
                          booking={booking}
                          key={booking.id}
                          onSelect={(slot) => void handleSelectSlot(slot)}
                        />
                      ))}
                    </div>
                  </div>

                  <div
                    className={[
                      'flex min-h-0 flex-col justify-between rounded-3xl border p-2 shadow-lg backdrop-blur-[1px] sm:p-3 md:p-4',
                      schedulePeriodStyles.pm.section,
                    ].join(' ')}
                    data-testid="schedule-period-pm"
                  >
                    <div>
                      <div
                        className={[
                          'mb-3 rounded-2xl border px-3 py-2 shadow-sm',
                          schedulePeriodStyles.pm.header,
                        ].join(' ')}
                      >
                        <p
                          className={[
                            'text-xs font-black',
                            schedulePeriodStyles.pm.kicker,
                          ].join(' ')}
                        >
                          فترة مسائية
                        </p>
                        <h3 className="text-lg font-black">مواعيد المساء</h3>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 sm:gap-2 md:grid-cols-3 lg:grid-cols-4">
                      {pmSlots.map((booking) => (
                        <BookingCard
                          booking={booking}
                          key={booking.id}
                          onSelect={(slot) => void handleSelectSlot(slot)}
                        />
                      ))}
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {statusLegend.map((item) => (
              <span
                className="inline-flex items-center gap-2 rounded-full bg-[var(--sloty-surface)] px-3 py-1 text-xs font-bold text-[var(--sloty-text-muted)]"
                key={item.label}
              >
                <span
                  aria-hidden="true"
                  className={[
                    'h-3 w-3 rounded-full border-2',
                    item.className,
                  ].join(' ')}
                />
                {item.label}
              </span>
            ))}
          </div>
        </section>

        <ScheduleSummary summary={summary} />

        <ScheduleClosingSection
          bookings={closingBookings.items}
          onSelectBooking={handleSelectClosingBooking}
          selectedDate={selectedDate}
          totalCount={closingBookings.totalCount}
        />

        {bookingIntents.length > 0 || intentError ? (
          <section className="space-y-3">
            <AppCard className="space-y-3 border-amber-200 bg-amber-50/70">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-black text-amber-950">
                    {bookingIntents.length === 1
                      ? 'طلب حجز محتاج مراجعة'
                      : `${bookingIntents.length} طلبات حجز محتاجة مراجعة`}
                  </h2>
                  <p className="text-xs font-bold leading-5 text-amber-900">
                    دي طلبات محفوظة على الجهاز. الحجز الحقيقي بيتم بس بعد رجوع
                    الاتصال والضغط على احجز الآن.
                  </p>
                </div>
                {!isOfflineLike ? (
                  <AppButton
                    onClick={() => void requestSyncRef.current()}
                    type="button"
                    variant="secondary"
                  >
                    راجع الطلبات
                  </AppButton>
                ) : null}
              </div>

              {intentError ? (
                <p className="rounded-xl bg-[var(--sloty-danger-soft)] px-3 py-2 text-sm font-bold text-[var(--sloty-danger)]">
                  {intentError}
                </p>
              ) : null}

              {bookingIntents.map((intent) => {
                const isSubmittingThisIntent =
                  submittingIntentId === intent.local_id
                const shouldShowBookNow = intent.status === 'READY_TO_BOOK'
                const shouldShowAlternatives =
                  intent.status === 'CONFLICT' || intent.status === 'EXPIRED'
                const appointmentLabel = formatArabicDateWithWeekday(
                  intent.requested_date,
                )
                const timeLabel = `${formatTime12Hour(
                  getSlotWallTime(intent.requested_start),
                )} – ${formatTime12Hour(getSlotWallTime(intent.requested_end))}`

                return (
                  <div
                    className="rounded-2xl border border-white bg-white p-3 shadow-sm"
                    key={intent.local_id}
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 space-y-1">
                        <p className="text-base font-black text-[var(--sloty-text-primary)]">
                          {intent.customer_name}
                        </p>
                        <p
                          className="text-sm font-bold text-[var(--sloty-text-muted)]"
                          dir="ltr"
                        >
                          {intent.customer_phone}
                        </p>
                        <p className="text-sm font-bold text-[var(--sloty-text-primary)]">
                          {appointmentLabel} · {timeLabel}
                        </p>
                        <p className="text-xs font-bold text-[var(--sloty-text-muted)]">
                          {getCourtName(intent.court_id)}
                        </p>
                      </div>
                      <span
                        className={[
                          'w-fit rounded-full border px-3 py-1 text-xs font-black',
                          getIntentStatusTone(intent.status),
                        ].join(' ')}
                      >
                        {getBookingIntentStatusLabel(intent.status)}
                      </span>
                    </div>

                    {intent.status === 'READY_TO_BOOK' ? (
                      <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-900">
                        ✓ المعاد لسه متاح
                      </p>
                    ) : null}

                    {intent.status === 'CONFLICT' ? (
                      <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-900">
                        المعاد مبقاش متاح.
                      </p>
                    ) : null}

                    {intent.status === 'PENDING_RECHECK' ? (
                      <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm font-bold text-amber-900">
                        بانتظار التأكيد بعد تحديث جدول المواعيد.
                      </p>
                    ) : null}

                    {intent.status === 'EXPIRED' ? (
                      <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700">
                        انتهى الطلب لأن ميعاد اللعب عدى.
                      </p>
                    ) : null}

                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      {shouldShowBookNow ? (
                        <AppButton
                          disabled={isSubmittingThisIntent || isOfflineLike}
                          onClick={() => void handleBookIntent(intent)}
                          type="button"
                        >
                          {isSubmittingThisIntent ? 'جاري الحجز...' : 'احجز الآن'}
                        </AppButton>
                      ) : null}
                      {shouldShowAlternatives ? (
                        <AppButton
                          onClick={() => void handleShowAlternativeSlots(intent)}
                          type="button"
                          variant="secondary"
                        >
                          اختار معاد تاني
                        </AppButton>
                      ) : null}
                      <AppButton
                        onClick={() => void handleDismissBookingIntent(intent.local_id)}
                        type="button"
                        variant="secondary"
                      >
                        تجاهل الطلب
                      </AppButton>
                    </div>

                    {alternativeIntentId === intent.local_id ? (
                      <div className="mt-3 space-y-2 rounded-2xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] p-3">
                        <p className="text-xs font-bold text-[var(--sloty-text-muted)]">
                          المواعيد البديلة من آخر جدول محفوظ بعد التحديث. Sloty
                          مش بيولّد مواعيد جديدة.
                        </p>
                        {alternativeSlots.length === 0 ? (
                          <p className="text-sm font-bold text-[var(--sloty-text-primary)]">
                            مفيش مواعيد بديلة محفوظة متاحة لليوم ده.
                          </p>
                        ) : (
                          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                            {alternativeSlots.map((alternative) => (
                              <button
                                className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-right text-sm font-bold text-emerald-950 transition hover:border-[var(--sloty-primary)] hover:bg-emerald-50"
                                key={[
                                  alternative.courtId,
                                  alternative.date,
                                  alternative.startTime,
                                  alternative.endTime,
                                ].join(':')}
                                onClick={() =>
                                  void handleSelectAlternativeSlot(
                                    intent,
                                    alternative,
                                  )
                                }
                                type="button"
                              >
                                <span className="block">
                                  {alternative.courtName}
                                </span>
                                <span className="mt-1 block" dir="ltr">
                                  {formatTime12Hour(alternative.startTime)} –{' '}
                                  {formatTime12Hour(alternative.endTime)}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </AppCard>
          </section>
        ) : null}
      </div>

      {successMessage ? (
        <AppSuccessNotice
          message={successMessage}
          onDismiss={() => setSuccessMessage(null)}
        />
      ) : null}

      {selectedSlot &&
      selectedSlot.status === 'available' &&
      selectedSlot.isAvailable &&
      selectedCourt ? (
        <AddBookingSheet
          canStartRecurring={selectedSlot.canStartRecurring}
          courtName={selectedCourt.name}
          dateLabel={selectedDateLabel}
          endTime={selectedSlot.endTime}
          error={createError}
          fieldErrors={createFieldErrors}
          firstRecurringConflictStart={selectedSlot.firstRecurringConflictStart}
          isSubmitting={isCreateSubmitting}
          offlineIntentMode={isOfflineLike}
          onClose={() => {
            setSelectedSlot(null)
            setCreateError(null)
            setCreateFieldErrors(null)
          }}
          onSubmit={handleCreateBooking}
          recurringBlockedReason={selectedSlot.recurringBlockedReason}
          startTime={selectedSlot.startTime}
          slotPrice={selectedSlot.slotPrice}
        />
      ) : null}

      {selectedSlot &&
      selectedSlot.status === 'recurring_reserved' &&
      selectedCourt ? (
        <VirtualRecurringSlotDetailsSheet
          courtName={selectedCourt.name || 'لا يوجد ملعب'}
          error={lifecycleError}
          isSubmitting={isLifecycleSubmitting}
          onClose={() => {
            setSelectedSlot(null)
            setLifecycleError(null)
          }}
          onEndRecurrence={(anchorBookingId) => {
            void handleEndVirtualRecurrence(anchorBookingId)
          }}
          slot={selectedSlot}
        />
      ) : null}

      {!paymentBooking &&
      !cancellingBooking &&
      !completingBooking &&
      !noShowBooking &&
      !editingBooking &&
      !reschedulingBooking &&
      (holdBooking ||
      selectedActionBooking ||
      (selectedSlot &&
        selectedSlot.status !== 'recurring_reserved' &&
        selectedSlot.booking &&
        (selectedSlot.status === 'hold' ||
          selectedSlot.status === 'confirmed' ||
          selectedSlot.status === 'completed' ||
          selectedSlot.status === 'no_show'))) ? (
        <BookingActionSheet
          booking={selectedActionBooking ?? holdBooking ?? selectedSlot?.booking ?? null}
          courtName={selectedCourt?.name ?? 'لا يوجد ملعب'}
          dateValue={selectedDate}
          error={
            paymentBooking || cancellingBooking || completingBooking || noShowBooking
              ? null
              : (selectedActionBooking ?? selectedSlot?.booking)?.status === 'HOLD'
              ? holdActionError
              : lifecycleError
          }
          isOpen
          isSubmitting={
            (selectedActionBooking ?? selectedSlot?.booking)?.status === 'HOLD'
              ? isHoldActionSubmitting
              : isLifecycleSubmitting
          }
          onAddPayment={(booking) => {
            if (!requireOnlineAction(setLifecycleError)) {
              return
            }
            setPaymentBooking(booking)
            setPaymentError(null)
            setPaymentFieldErrors(null)
          }}
          onCancel={(booking) => {
            void handleRequestCancelBooking(booking)
          }}
          onClose={() => {
            setSelectedSlot(null)
            setSelectedActionBooking(null)
            setHoldBooking(null)
            setPaymentBooking(null)
            setPaymentError(null)
            setPaymentFieldErrors(null)
            setCancellingBooking(null)
            setCancellationPreview(null)
            setCompletingBooking(null)
            setNoShowBooking(null)
            setEditingBooking(null)
            setReschedulingBooking(null)
            setLifecycleError(null)
            setLifecycleFieldErrors(null)
            setHoldActionError(null)
          }}
          onComplete={(booking) => {
            if (!requireOnlineAction(setLifecycleError)) {
              return
            }
            setCompletingBooking(booking)
            setCompletingBookingRemainingAmount(null)
            setLifecycleError(null)
            setLifecycleFieldErrors(null)
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
            if (!requireOnlineAction(setLifecycleError)) {
              return
            }
            setNoShowBooking(booking)
            setLifecycleError(null)
            setLifecycleFieldErrors(null)
          }}
          onReschedule={(booking) => {
            void handleStartReschedule(booking)
          }}
        />
      ) : null}

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
          minimumDepositHint={getCourtMinimumDeposit(selectedCourt)}
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
          error={lifecycleError}
          fieldErrors={lifecycleFieldErrors}
          isSubmitting={isLifecycleSubmitting}
          onClose={() => {
            setCancellingBooking(null)
            setCancellationPreview(null)
            setLifecycleError(null)
            setLifecycleFieldErrors(null)
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
          error={lifecycleError}
          isSubmitting={isLifecycleSubmitting}
          onClose={() => {
            setCompletingBooking(null)
            setCompletingBookingRemainingAmount(null)
            setLifecycleError(null)
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
            setLifecycleError(null)
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
          error={lifecycleError}
          fieldErrors={lifecycleFieldErrors}
          isSubmitting={isLifecycleSubmitting}
          onClose={() => {
            setEditingBooking(null)
            setLifecycleError(null)
            setLifecycleFieldErrors(null)
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
          error={lifecycleError}
          fieldErrors={lifecycleFieldErrors}
          isSubmitting={isLifecycleSubmitting}
          onClose={() => {
            setReschedulingBooking(null)
            setLifecycleError(null)
            setLifecycleFieldErrors(null)
          }}
          onSubmit={handleRescheduleBooking}
        />
      ) : null}

      {noShowBooking ? (
        <NoShowReasonSheet
          error={lifecycleError}
          isSubmitting={isLifecycleSubmitting}
          onClose={() => {
            setNoShowBooking(null)
            setLifecycleError(null)
          }}
          onSubmit={handleNoShowBooking}
          recurrenceWillEnd={hasActiveRecurrence(noShowBooking)}
        />
      ) : null}
    </div>
  )
}
