import { useEffect, useMemo, useState } from 'react'
import {
  getApiErrorCode,
  getApiErrorMessage,
  getApiFieldErrors,
} from '../../../core/api/apiError.helpers'
import type { ApiFieldError } from '../../../core/api/apiClient'
import { useAuth } from '../../../core/auth/useAuth'
import type { CurrentUserMembershipClub } from '../../../core/auth/auth.types'
import { getCourtWorkingHours } from '../../courts/courtWorkingHoursApi'
import type { CourtWorkingHour } from '../../courts/courtWorkingHours.types'
import { listCourts } from '../../courts/courtsApi'
import type { Court } from '../../courts/courts.types'
import {
  AddBookingSheet,
  type AddBookingSheetValues,
} from '../components/AddBookingSheet/AddBookingSheet'
import { BookingDetailsSheet } from '../components/BookingDetailsSheet/BookingDetailsSheet'
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
import { HoldBookingActionSheet } from '../components/HoldBookingActionSheet/HoldBookingActionSheet'
import { ScheduleHeader } from '../components/ScheduleHeader/ScheduleHeader'
import { createTransaction } from '../../transactions/transactionsApi'
import {
  RecordPaymentSheet,
  type RecordPaymentSheetValues,
} from '../../transactions/components/RecordPaymentSheet/RecordPaymentSheet'
import {
  createDateFilterOptions,
  formatBookingDateTime,
  generateSlotsFromWorkingHour,
  getWeekdayFromDateValue,
} from '../scheduleBoard.helpers'
import type { ScheduleBooking } from '../schedule.types'
import {
  cancelBooking,
  completeBooking,
  createBooking,
  listBookingsForCourtDay,
  markBookingNoShow,
} from '../scheduleApi'
import type { BookingListItem } from '../scheduleApi.types'

const statusLegend = [
  {
    label: 'متاح',
    className: 'border-[#22C55E] bg-white',
  },
  {
    label: 'محجوز مؤقتًا',
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
    label: 'ملغي',
    className: 'border-[#D1D5DB] bg-[#F3F4F6]',
  },
]

const bookingConflictCodes = new Set([
  'BOOKING_SLOT_ALREADY_TAKEN',
  'BOOKING_OVERLAP',
])

function getSummary(slots: ScheduleBooking[]) {
  return {
    availableCount: slots.filter((slot) => slot.status === 'available').length,
    confirmedCount: slots.filter((slot) => slot.status === 'confirmed').length,
    cancelledCount: slots.filter((slot) => slot.status === 'cancelled').length,
    totalSlots: slots.length,
  }
}

function getCourtDateLabel(date: string): string {
  return new Intl.DateTimeFormat('ar-EG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(`${date}T00:00:00`))
}

async function fetchBookingResults(
  clubSlug: string,
  courtId: number,
  date: string,
): Promise<BookingListItem[]> {
  const response = await listBookingsForCourtDay(clubSlug, {
    court: courtId,
    date,
  })

  const results = Array.isArray(response)
    ? response
    : response?.results

  return Array.isArray(results) ? results : []
}

/**
 * Booking Board for court availability and quick manual creation.
 *
 * It uses the selected club context, courts, working hours, and bookings to
 * generate availability slots. Available/cancelled slots create manual
 * bookings, HOLD slots show next-step actions, and confirmed slots show
 * booking details with focused lifecycle actions.
 */
export function SchedulePage() {
  const { selectedClubSlug, selectedMembership } = useAuth()
  const dateFilters = useMemo(() => createDateFilterOptions(), [])
  const [selectedDate, setSelectedDate] = useState(dateFilters[0].date)
  const [activeDateKey, setActiveDateKey] = useState<string | null>('today')
  const selectedClub: CurrentUserMembershipClub | null =
    selectedMembership?.club ?? null
  const [courts, setCourts] = useState<Court[]>([])
  const [selectedCourtId, setSelectedCourtId] = useState<number | null>(null)
  const [workingHours, setWorkingHours] = useState<CourtWorkingHour[]>([])
  const [bookings, setBookings] = useState<BookingListItem[]>([])
  const [setupMessage, setSetupMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSetupLoading, setIsSetupLoading] = useState(true)
  const [isWorkingHoursLoading, setIsWorkingHoursLoading] = useState(false)
  const [isBookingsLoading, setIsBookingsLoading] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<ScheduleBooking | null>(null)
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
  const [completingBooking, setCompletingBooking] =
    useState<BookingListItem | null>(null)
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
  const selectedCourt =
    courts.find((court) => court.id === selectedCourtId) ?? null
  const selectedWorkingHour = selectedCourt
    ? workingHours.find(
        (workingHour) =>
          workingHour.weekday === getWeekdayFromDateValue(selectedDate),
      )
    : undefined
  const slotGeneration = selectedCourt
    ? generateSlotsFromWorkingHour(
        selectedWorkingHour,
        selectedCourt.slot_duration_minutes,
        bookings,
        selectedDate,
      )
    : { slots: [], message: setupMessage }
  const slots = slotGeneration.slots
  const boardMessage = slotGeneration.message ?? setupMessage
  const daySlots = slots.filter((booking) => booking.period === 'day')
  const nightSlots = slots.filter((booking) => booking.period === 'night')
  const summary = getSummary(slots)

  useEffect(() => {
    let isActive = true

    async function loadSetup(): Promise<void> {
      if (!selectedClubSlug || !selectedClub) {
        setCourts([])
        setSelectedCourtId(null)
        setWorkingHours([])
        setBookings([])
        setSetupMessage('اختر ناديًا أولًا لعرض جدول الحجز')
        setError(null)
        setIsSetupLoading(false)
        return
      }

      setIsSetupLoading(true)
      setError(null)
      setSetupMessage(null)

      try {
        const courtsResponse = await listCourts(selectedClubSlug)
        const activeCourts = courtsResponse.results.filter(
          (court) => court.is_active,
        )
        const firstActiveCourt = activeCourts[0] ?? null

        if (isActive) {
          setCourts(activeCourts)
          setSelectedCourtId(firstActiveCourt?.id ?? null)
          setSetupMessage(
            firstActiveCourt ? null : 'لا توجد ملاعب نشطة لعرض جدول الحجز',
          )
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
  }, [selectedClub, selectedClubSlug])

  useEffect(() => {
    if (!selectedClubSlug || !selectedCourt) {
      queueMicrotask(() => setWorkingHours([]))
      return
    }

    let isActive = true
    const clubSlug = selectedClubSlug
    const courtId = selectedCourt.id

    async function loadWorkingHours(): Promise<void> {
      setIsWorkingHoursLoading(true)
      setWorkingHours([])
      setError(null)

      try {
        const response = await getCourtWorkingHours(clubSlug, courtId)

        if (isActive) {
          setWorkingHours(response.working_hours)
        }
      } catch (error) {
        if (isActive) {
          setWorkingHours([])
          setError(
            getApiErrorMessage(error, 'تعذر تحميل مواعيد عمل الملعب'),
          )
        }
      } finally {
        if (isActive) {
          setIsWorkingHoursLoading(false)
        }
      }
    }

    void loadWorkingHours()

    return () => {
      isActive = false
    }
  }, [selectedClubSlug, selectedCourt])

  async function reloadBookings(): Promise<void> {
    if (!selectedClubSlug || !selectedCourt) {
      setBookings([])
      return
    }

    const clubSlug = selectedClubSlug
    const courtId = selectedCourt.id
    const date = selectedDate

    setIsBookingsLoading(true)
    setError(null)

    try {
      setBookings(await fetchBookingResults(clubSlug, courtId, date))
    } catch (error) {
      setBookings([])
      setError(getApiErrorMessage(error, 'تعذر تحميل حجوزات اليوم'))
    } finally {
      setIsBookingsLoading(false)
    }
  }

  useEffect(() => {
    if (!selectedClubSlug || !selectedCourt) {
      queueMicrotask(() => setBookings([]))
      return
    }

    let isActive = true
    const clubSlug = selectedClubSlug
    const courtId = selectedCourt.id
    const date = selectedDate

    async function loadBookings(): Promise<void> {
      setIsBookingsLoading(true)
      setError(null)

      try {
        const results = await fetchBookingResults(clubSlug, courtId, date)

        if (isActive) {
          setBookings(results)
        }
      } catch (error) {
        if (isActive) {
          setBookings([])
          setError(getApiErrorMessage(error, 'تعذر تحميل حجوزات اليوم'))
        }
      } finally {
        if (isActive) {
          setIsBookingsLoading(false)
        }
      }
    }

    void loadBookings()

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
      const slot = selectedSlot
      const createdBooking = await createBooking(selectedClubSlug, {
        court: selectedCourt.id,
        customer_name: values.customer_name,
        customer_phone: values.customer_phone,
        start_time: formatBookingDateTime(selectedDate, selectedSlot.startTime),
        end_time: formatBookingDateTime(selectedDate, selectedSlot.endTime),
        source: 'MANUAL',
        ...(values.notes ? { notes: values.notes } : {}),
      })

      setSelectedSlot(null)
      await reloadBookings()

      if (createdBooking.status === 'HOLD') {
        setSelectedSlot({
          ...slot,
          status: 'hold',
          booking: createdBooking,
        })
        setHoldBooking(createdBooking)
      }
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
        await reloadBookings()
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
      setSelectedSlot(null)
      await reloadBookings()
    } catch (error) {
      setLifecycleError(
        getApiErrorMessage(error, 'تعذر إلغاء الحجز. حاول مرة أخرى'),
      )
      setLifecycleFieldErrors(getApiFieldErrors(error))
    } finally {
      setIsLifecycleSubmitting(false)
    }
  }

  async function handleCompleteBooking(): Promise<void> {
    if (!selectedClubSlug || !selectedCourt || !completingBooking) {
      return
    }

    setIsLifecycleSubmitting(true)
    setLifecycleError(null)
    setLifecycleFieldErrors(null)

    try {
      await completeBooking(selectedClubSlug, completingBooking.id)
      setCompletingBooking(null)
      setSelectedSlot(null)
      await reloadBookings()
    } catch (error) {
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
      setSelectedSlot(null)
      await reloadBookings()
    } catch (error) {
      setLifecycleError(
        getApiErrorMessage(error, 'تعذر تسجيل عدم الحضور. حاول مرة أخرى'),
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
        ...(values.reference ? { reference: values.reference } : {}),
        ...(values.notes ? { notes: values.notes } : {}),
      })
      setPaymentBooking(null)
      setHoldBooking(null)
      setSelectedSlot(null)
      setSuccessMessage('تم تسجيل الدفعة بنجاح')
      await reloadBookings()
    } catch (error) {
      setPaymentError(
        getApiErrorMessage(
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
        reason: 'تحرير الحجز المؤقت',
        notes: 'تم تحرير الموعد من لوحة الحجز',
      })
      setHoldBooking(null)
      setSelectedSlot(null)
      setSuccessMessage('تم تحرير الموعد بنجاح')
      await reloadBookings()
    } catch (error) {
      setHoldActionError(
        getApiErrorMessage(error, 'تعذر تحرير الموعد. حاول مرة أخرى'),
      )
    } finally {
      setIsHoldActionSubmitting(false)
    }
  }

  function handleSelectSlot(slot: ScheduleBooking): void {
    setSuccessMessage(null)
    setCreateError(null)
    setCreateFieldErrors(null)
    setPaymentError(null)
    setPaymentFieldErrors(null)
    setLifecycleError(null)
    setLifecycleFieldErrors(null)
    setHoldActionError(null)

    if (slot.status === 'available' || slot.status === 'cancelled') {
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

    if (slot.status === 'completed') {
      setSelectedSlot(null)
      setHoldBooking(null)
    }
  }

  function clearScheduleSelection(): void {
    setSelectedSlot(null)
    setHoldBooking(null)
    setPaymentBooking(null)
    setCancellingBooking(null)
    setCompletingBooking(null)
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
    setWorkingHours([])
    setBookings([])
    clearScheduleSelection()
  }

  function handleDateChange(nextDateKey: string): void {
    const nextDate = dateFilters.find((filter) => filter.key === nextDateKey)
      ?.date

    if (!nextDate) {
      return
    }

    setActiveDateKey(nextDateKey)
    setSelectedDate(nextDate)
    clearScheduleSelection()
  }

  function handleDateInputChange(nextDate: string): void {
    if (!nextDate) {
      return
    }

    setSelectedDate(nextDate)
    setActiveDateKey(
      dateFilters.find((filter) => filter.date === nextDate)?.key ?? null,
    )
    clearScheduleSelection()
  }

  const scheduleCourt = {
    clubName: selectedClub?.name ?? 'سلوتي',
    courtName: selectedCourt?.name ?? 'لا يوجد ملعب',
    dateLabel: getCourtDateLabel(selectedDate),
  }
  const scheduleStaff = {
    name: 'مستخدم سلوتي',
    role: 'تشغيل الملعب',
  }
  const scheduleDateFilters = dateFilters.map(({ key, label }) => ({
    key,
    label,
  }))
  const shouldShowBoardSlots =
    !isSetupLoading &&
    !isWorkingHoursLoading &&
    !isBookingsLoading &&
    !error &&
    slots.length > 0
  const shouldShowBoardMessage =
    !isSetupLoading &&
    !isWorkingHoursLoading &&
    !isBookingsLoading &&
    !error &&
    Boolean(boardMessage) &&
    slots.length === 0
  const loadingMessage = isSetupLoading
    ? 'جاري تحميل إعدادات جدول الحجز...'
    : isWorkingHoursLoading
      ? 'جاري تحميل مواعيد عمل الملعب...'
    : 'جاري تحميل حجوزات اليوم...'

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-7xl flex-col bg-[var(--sloty-bg)]">
      <div className="space-y-4 md:space-y-6">
        <ScheduleHeader
          activeDateKey={activeDateKey}
          court={scheduleCourt}
          dateFilters={scheduleDateFilters}
          onDateChange={handleDateChange}
          staff={scheduleStaff}
          summary={summary}
        />

        <section className="flex flex-col gap-3 rounded-2xl border border-[var(--sloty-border)] bg-[var(--sloty-surface)] p-4 shadow-[var(--sloty-shadow)] md:flex-row md:items-center md:justify-between md:px-5">
          <div className="space-y-1">
            <h2 className="text-lg font-black text-[var(--sloty-text-primary)]">
              لوحة الحجز
            </h2>
            <p className="text-sm text-[var(--sloty-text-muted)]">
              اختر فترة متاحة أو ملغية لإضافة حجز، أو فترة مؤكدة/مؤقتة لعرض الإجراء المناسب
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="flex items-center gap-2 text-sm font-bold text-[var(--sloty-text-muted)]">
              <span>تاريخ الحجز</span>
              <input
                className="h-10 rounded-xl border border-[var(--sloty-border)] bg-white px-3 text-sm font-bold text-[var(--sloty-text-primary)]"
                onChange={(event) => handleDateInputChange(event.target.value)}
                type="date"
                value={selectedDate}
              />
            </label>
            {courts.length > 1 ? (
              <label className="flex items-center gap-2 text-sm font-bold text-[var(--sloty-text-muted)]">
                <span>الملعب</span>
                <select
                  className="h-10 rounded-xl border border-[var(--sloty-border)] bg-white px-3 text-sm font-bold text-[var(--sloty-text-primary)]"
                  onChange={(event) => handleCourtChange(event.target.value)}
                  value={selectedCourtId ?? ''}
                >
                  {courts.map((court) => (
                    <option key={court.id} value={court.id}>
                      {court.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {statusLegend.map((item) => (
                <span
                  className="inline-flex items-center gap-2 rounded-full bg-[var(--sloty-bg)] px-3 py-1 text-xs font-bold text-[var(--sloty-text-muted)]"
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
          </div>
        </section>

        <section
          aria-label="لوحة فترات الملعب"
          className="relative overflow-hidden rounded-[28px] border border-[var(--sloty-border)] bg-cover bg-center shadow-[var(--sloty-shadow)]"
          style={{
            backgroundImage: "url('/images/sloty-court-board-bg.png')",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/30 via-emerald-900/10 to-slate-950/35" />
          <div className="relative z-10 grid min-h-[560px] grid-cols-1 gap-3 p-2 sm:min-h-[560px] sm:gap-4 sm:p-4 md:min-h-[480px] md:grid-cols-2 md:p-5 lg:min-h-[540px] lg:p-6">
            {isSetupLoading ||
            isWorkingHoursLoading ||
            isBookingsLoading ||
            error ||
            shouldShowBoardMessage ? (
              <div className="flex items-center justify-center rounded-3xl border border-white/20 bg-white/88 p-5 text-center md:col-span-2">
                <p className="text-sm font-bold text-[var(--sloty-text-primary)]">
                  {error ??
                    (isSetupLoading || isWorkingHoursLoading || isBookingsLoading
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
                       الفترة النهارية 
                    </p>
                    <h3 className="text-lg font-black text-white">مواعيد النهار </h3>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 sm:gap-2 md:grid-cols-3 lg:grid-cols-4">
                    {daySlots.map((booking) => (
                      <BookingCard
                        booking={booking}
                        key={booking.id}
                        onSelect={handleSelectSlot}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex min-h-0 flex-col justify-between rounded-3xl border border-white/20 bg-slate-950/20 p-2 backdrop-blur-[1px] sm:p-3 md:p-4">
                  <div>
                    <p className="text-xs font-bold text-white/75">
                      الفترة المسائية
                    </p>
                    <h3 className="text-lg font-black text-white">مواعيد المساء</h3>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 sm:gap-2 md:grid-cols-3 lg:grid-cols-4">
                    {nightSlots.map((booking) => (
                      <BookingCard
                        booking={booking}
                        key={booking.id}
                        onSelect={handleSelectSlot}
                      />
                    ))}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </section>
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
      (selectedSlot.status === 'available' || selectedSlot.status === 'cancelled') &&
      selectedCourt ? (
        <AddBookingSheet
          courtName={selectedCourt.name}
          dateLabel={scheduleCourt.dateLabel}
          endTime={selectedSlot.endTime}
          error={createError}
          fieldErrors={createFieldErrors}
          isSubmitting={isCreateSubmitting}
          onClose={() => {
            setSelectedSlot(null)
            setCreateError(null)
            setCreateFieldErrors(null)
          }}
          onSubmit={handleCreateBooking}
          startTime={selectedSlot.startTime}
        />
      ) : null}

      {selectedSlot?.status === 'hold' && holdBooking ? (
        <HoldBookingActionSheet
          booking={holdBooking}
          courtName={selectedCourt?.name ?? 'لا يوجد ملعب'}
          dateLabel={scheduleCourt.dateLabel}
          error={holdActionError}
          isSubmitting={isHoldActionSubmitting}
          onAddPayment={(booking) => {
            setPaymentBooking(booking)
            setHoldBooking(null)
            setSelectedSlot(null)
            setPaymentError(null)
            setPaymentFieldErrors(null)
          }}
          onClose={() => {
            setSelectedSlot(null)
            setHoldBooking(null)
            setHoldActionError(null)
          }}
          onFreeSlot={(booking) => {
            void handleFreeHoldBooking(booking)
          }}
          slot={selectedSlot}
        />
      ) : null}

      {selectedSlot?.status === 'confirmed' ? (
        <BookingDetailsSheet
          booking={selectedSlot.booking}
          courtName={selectedCourt?.name ?? 'لا يوجد ملعب'}
          dateLabel={scheduleCourt.dateLabel}
          error={null}
          isSubmitting={isLifecycleSubmitting}
          onAddPayment={(booking) => {
            setPaymentBooking(booking)
            setPaymentError(null)
            setPaymentFieldErrors(null)
          }}
          onClose={() => {
            setSelectedSlot(null)
            setHoldBooking(null)
            setPaymentBooking(null)
            setPaymentError(null)
            setPaymentFieldErrors(null)
            setCancellingBooking(null)
            setCompletingBooking(null)
            setNoShowBooking(null)
            setLifecycleError(null)
            setLifecycleFieldErrors(null)
            setHoldActionError(null)
          }}
          onRequestCancel={(booking) => {
            setCancellingBooking(booking)
            setLifecycleError(null)
            setLifecycleFieldErrors(null)
          }}
          onRequestComplete={(booking) => {
            setCompletingBooking(booking)
            setLifecycleError(null)
            setLifecycleFieldErrors(null)
          }}
          onRequestNoShow={(booking) => {
            setNoShowBooking(booking)
            setLifecycleError(null)
            setLifecycleFieldErrors(null)
          }}
          slot={selectedSlot}
        />
      ) : null}

      {paymentBooking ? (
        <RecordPaymentSheet
          bookingId={paymentBooking.id}
          error={paymentError}
          fieldErrors={paymentFieldErrors}
          isSubmitting={isPaymentSubmitting}
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
            setLifecycleError(null)
            setLifecycleFieldErrors(null)
          }}
          onSubmit={handleCancelBooking}
        />
      ) : null}

      {completingBooking ? (
        <CompleteBookingConfirmSheet
          error={lifecycleError}
          isSubmitting={isLifecycleSubmitting}
          onClose={() => {
            setCompletingBooking(null)
            setLifecycleError(null)
          }}
          onConfirm={handleCompleteBooking}
          remainingAmount={completingBooking.remaining_amount}
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
        />
      ) : null}
    </div>
  )
}
