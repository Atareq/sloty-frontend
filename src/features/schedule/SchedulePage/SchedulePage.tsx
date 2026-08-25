import { useEffect, useMemo, useRef, useState } from 'react'
import {
  getApiErrorCode,
  getApiErrorDetails,
  getApiErrorMessage,
  getApiFieldErrors,
} from '../../../core/api/apiError.helpers'
import type { ApiFieldError } from '../../../core/api/apiClient'
import { useAuth } from '../../../core/auth/useAuth'
import {
  canChooseOperationalCourt,
  getAssignedOperationalCourtId,
  type CurrentUserMembershipClub,
  type CurrentUserMembershipCourt,
} from '../../../core/auth/auth.types'
import { AppDateNavigator } from '../../../shared/components/AppDateNavigator/AppDateNavigator'
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
import { BookingActionSheet } from '../../bookings/components/BookingActionSheet/BookingActionSheet'
import { hasActiveRecurrence } from '../../bookings/bookingRecurrence.helpers'
import { createTransaction } from '../../transactions/transactionsApi'
import {
  RecordPaymentSheet,
  type RecordPaymentSheetValues,
} from '../../transactions/components/RecordPaymentSheet/RecordPaymentSheet'
import {
  formatBookingDateTime,
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
} from '../scheduleApi'
import {
  BOOKING_COMPLETION_REQUIRES_FULL_PAYMENT,
  type BookingCompletePayload,
  type BookingCancellationPreview,
  type BookingListItem,
} from '../scheduleApi.types'
import { AppSelect } from '../../../shared/components/AppSelect/AppSelect'

const BOOKING_CANCELLATION_TIME_PASSED = 'BOOKING_CANCELLATION_TIME_PASSED'
const FIRST_PAYMENT_BELOW_MINIMUM_DEPOSIT = 'FIRST_PAYMENT_BELOW_MINIMUM_DEPOSIT'

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
    label: 'مؤكد',
    className: 'sloty-green-surface-button border-[var(--sloty-primary-dark)]',
  },
  {
    label: 'مكتمل',
    className: 'border-slate-400 bg-slate-200',
  },
  {
    label: 'عدم حضور',
    className: 'border-rose-300 bg-rose-100',
  },
]

const bookingConflictCodes = new Set([
  'BOOKING_SLOT_UNAVAILABLE',
  'BOOKING_SLOT_ALREADY_TAKEN',
  'BOOKING_OVERLAP',
])

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

/**
 * Booking Board for court availability and quick manual creation.
 *
 * It uses the backend booking slots endpoint as the schedule authority.
 * FREE slots create manual bookings, while occupied slots open the existing
 * booking action/details surfaces when the backend includes booking details.
 */
export function SchedulePage() {
  const { role, selectedClubSlug, selectedMembership } = useAuth()
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
  const [isLifecycleSubmitting, setIsLifecycleSubmitting] = useState(false)
  const [lifecycleError, setLifecycleError] = useState<string | null>(null)
  const [lifecycleFieldErrors, setLifecycleFieldErrors] = useState<Record<
    string,
    ApiFieldError[]
  > | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [settledSlotsDate, setSettledSlotsDate] = useState<string | null>(null)
  const slotsSectionRef = useRef<HTMLElement | null>(null)
  const pendingSlotsScrollDateRef = useRef<string | null>(null)
  useEffect(() => {
    if (!successMessage) {
      return
    }

    const timeoutId = window.setTimeout(() => setSuccessMessage(null), 3000)
    return () => window.clearTimeout(timeoutId)
  }, [successMessage])

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
  const amSlots = slots.filter((booking) => booking.period === 'am')
  const pmSlots = slots.filter((booking) => booking.period === 'pm')
  const summary = getSummary(slots)
  const bookingSummaries = getBookingSummariesFromScheduleSlots(slots)
  const closingBookings = getScheduleClosingBookings(
    bookingSummaries,
    selectedDate,
  )

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

    const clubSlug = selectedClubSlug
    const courtId = selectedCourt.id
    const date = selectedDate

    setIsSlotsLoading(true)
    setError(null)

    try {
      const response = await listBookingSlots(clubSlug, {
        court: courtId,
        date,
      })
      setSlots(mapBookingSlotsResponseToScheduleBookings(response))
      setBoardMessage(
        response.slots.length === 0
          ? response.message || 'مفيش مواعيد متاحة في اليوم ده.'
          : null,
      )
    } catch (error) {
      setSlots([])
      setBoardMessage(null)
      setError(getApiErrorMessage(error, 'تعذر تحميل مواعيد اليوم'))
    } finally {
      setIsSlotsLoading(false)
    }
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
    const clubSlug = selectedClubSlug
    const courtId = selectedCourt.id
    const date = selectedDate

    async function loadSlots(): Promise<void> {
      setIsSlotsLoading(true)
      setError(null)

      try {
        const response = await listBookingSlots(clubSlug, {
          court: courtId,
          date,
        })

        if (isActive) {
          setSlots(mapBookingSlotsResponseToScheduleBookings(response))
          setBoardMessage(
            response.slots.length === 0
              ? response.message || 'مفيش مواعيد متاحة في اليوم ده.'
              : null,
          )
          setSettledSlotsDate(date)
        }
      } catch (error) {
        if (isActive) {
          setSlots([])
          setBoardMessage(null)
          setError(getApiErrorMessage(error, 'تعذر تحميل مواعيد اليوم'))
          setSettledSlotsDate(date)
        }
      } finally {
        if (isActive) {
          setIsSlotsLoading(false)
        }
      }
    }

    void loadSlots()

    return () => {
      isActive = false
    }
  }, [selectedClubSlug, selectedCourt, selectedDate])

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

  async function handleCancelBooking(
    values: CancelBookingReasonValues,
  ): Promise<void> {
    if (!selectedClubSlug || !selectedCourt || !cancellingBooking) {
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

    setIsLifecycleSubmitting(true)
    setLifecycleError(null)

    try {
      const updatedBooking = await endBookingRecurrence(
        selectedClubSlug,
        booking.id,
      )
      setSelectedActionBooking(updatedBooking)
      setSelectedSlot(null)
      setSuccessMessage('تم إيقاف تكرار الحجز')
      await reloadScheduleSlots()
    } catch (error) {
      setLifecycleError(
        getApiErrorMessage(error, 'تعذر إيقاف التكرار الأسبوعي. حاول مرة أخرى'),
      )
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

    if (slot.status === 'recurring_reserved') {
      if (!slot.recurringAnchorBookingId || !selectedClubSlug) {
        setLifecycleError('تعذر تحميل تفاصيل الحجز.')
        return
      }

      setIsLifecycleSubmitting(true)
      try {
        setSelectedActionBooking(
          await getBooking(selectedClubSlug, slot.recurringAnchorBookingId),
        )
      } catch (error) {
        setLifecycleError(
          getApiErrorMessage(error, 'تعذر تحميل تفاصيل الحجز.'),
        )
      } finally {
        setIsLifecycleSubmitting(false)
      }
      return
    }

    if (slot.status === 'available' && slot.isAvailable) {
      setSelectedSlot(slot)
      setHoldBooking(null)
      return
    }

    if (slot.status === 'hold') {
      setSelectedSlot(slot)
      setHoldBooking(slot.booking ?? null)
      return
    }

    if (slot.status === 'confirmed') {
      setSelectedSlot(slot)
      setHoldBooking(null)
      return
    }

    if (slot.status === 'completed' || slot.status === 'no_show') {
      setSelectedSlot(slot.booking ? slot : null)
      setHoldBooking(null)
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
        <section className="space-y-4 rounded-2xl border border-[var(--sloty-border)] bg-[var(--sloty-surface)] p-4 shadow-[var(--sloty-shadow)] md:px-5">
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
            <h2 className="text-lg font-black text-[var(--sloty-text-primary)]">
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
          <h2 className="text-lg font-black text-[var(--sloty-text-primary)]">
            اختار المعاد
          </h2>
          {isLifecycleSubmitting && !selectedActionBooking ? (
            <p className="rounded-xl bg-[var(--sloty-soft-mint)] px-3 py-2 text-sm font-bold text-[var(--sloty-primary-dark)]">
              جاري تحميل تفاصيل الحجز...
            </p>
          ) : lifecycleError && !selectedActionBooking ? (
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
                  <p className="text-sm font-bold text-[var(--sloty-text-primary)]">
                    {error ??
                      (isSetupLoading || isSlotsLoading
                        ? loadingMessage
                        : boardMessage)}
                  </p>
                </div>
              ) : null}

              {shouldShowBoardSlots ? (
                <>
                  <div className="flex min-h-0 flex-col justify-between rounded-3xl border border-white/20 bg-white/10 p-2 backdrop-blur-[1px] sm:p-3 md:p-4">
                    <div>
                      <p className="text-xs font-bold text-white/75">
                        الفترة الصباحية · AM
                      </p>
                      <h3 className="text-lg font-black text-white">مواعيد ص</h3>
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

                  <div className="flex min-h-0 flex-col justify-between rounded-3xl border border-white/20 bg-slate-950/20 p-2 backdrop-blur-[1px] sm:p-3 md:p-4">
                    <div>
                      <p className="text-xs font-bold text-white/75">
                        الفترة المسائية · PM
                      </p>
                      <h3 className="text-lg font-black text-white">مواعيد م</h3>
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
      </div>

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

      {!paymentBooking &&
      !cancellingBooking &&
      !completingBooking &&
      !noShowBooking &&
      (holdBooking ||
      selectedActionBooking ||
      (selectedSlot &&
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
            setLifecycleError(null)
            setLifecycleFieldErrors(null)
            setHoldActionError(null)
          }}
          onComplete={(booking) => {
            setCompletingBooking(booking)
            setCompletingBookingRemainingAmount(null)
            setLifecycleError(null)
            setLifecycleFieldErrors(null)
          }}
          onEndRecurrence={(booking) => {
            void handleEndRecurrence(booking)
          }}
          onFreeHold={(booking) => {
            void handleFreeHoldBooking(booking)
          }}
          onNoShow={(booking) => {
            setNoShowBooking(booking)
            setLifecycleError(null)
            setLifecycleFieldErrors(null)
          }}
        />
      ) : null}

      {paymentBooking ? (
        <RecordPaymentSheet
          bookingId={paymentBooking.id}
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

      {completingBooking ? (
        <CompleteBookingConfirmSheet
          booking={completingBooking}
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
