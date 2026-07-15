import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../core/auth/useAuth'
import type { CurrentUserMembershipClub } from '../../../core/auth/auth.types'
import { listCourtWorkingHours } from '../../courts/courtWorkingHoursApi'
import type { CourtWorkingHour } from '../../courts/courtWorkingHours.types'
import { listCourts } from '../../courts/courtsApi'
import type { Court } from '../../courts/courts.types'
import {
  AddBookingSheet,
  type AddBookingSheetValues,
} from '../components/AddBookingSheet/AddBookingSheet'
import { BookingDetailsSheet } from '../components/BookingDetailsSheet/BookingDetailsSheet'
import { BookingCard } from '../components/BookingCard/BookingCard'
import { ScheduleHeader } from '../components/ScheduleHeader/ScheduleHeader'
import { createTransaction } from '../../transactions/transactionsApi'
import {
  RecordPaymentSheet,
  type RecordPaymentSheetValues,
} from '../../transactions/components/RecordPaymentSheet/RecordPaymentSheet'
import { RescheduleBookingSheet } from '../components/RescheduleBookingSheet/RescheduleBookingSheet'
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
  rescheduleBooking,
} from '../scheduleApi'
import type { BookingListItem } from '../scheduleApi.types'

const statusLegend = [
  {
    label: 'متاح',
    className: 'border-[#22C55E] bg-white',
  },
  {
    label: 'مؤكد',
    className: 'sloty-green-surface-button border-[var(--sloty-primary-dark)]',
  },
  {
    label: 'ملغي',
    className: 'border-[#D1D5DB] bg-[#F3F4F6]',
  },
]

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

  return response.results
}

/**
 * Booking Board for court availability and quick manual creation.
 *
 * It uses the selected club context, courts, working hours, and bookings to
 * generate availability slots. Available/cancelled slots create manual
 * bookings, and confirmed slots show booking details with focused lifecycle
 * actions.
 */
export function SchedulePage() {
  const { selectedClubSlug, selectedMembership } = useAuth()
  const dateFilters = useMemo(() => createDateFilterOptions(), [])
  const [activeDateKey, setActiveDateKey] = useState('today')
  const selectedClub: CurrentUserMembershipClub | null =
    selectedMembership?.club ?? null
  const [courts, setCourts] = useState<Court[]>([])
  const [selectedCourtId, setSelectedCourtId] = useState<number | null>(null)
  const [workingHours, setWorkingHours] = useState<CourtWorkingHour[]>([])
  const [bookings, setBookings] = useState<BookingListItem[]>([])
  const [setupMessage, setSetupMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSetupLoading, setIsSetupLoading] = useState(true)
  const [isBookingsLoading, setIsBookingsLoading] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<ScheduleBooking | null>(null)
  const [isCreateSubmitting, setIsCreateSubmitting] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [isBookingActionSubmitting, setIsBookingActionSubmitting] =
    useState(false)
  const [bookingActionError, setBookingActionError] = useState<string | null>(
    null,
  )
  const [paymentBooking, setPaymentBooking] = useState<BookingListItem | null>(
    null,
  )
  const [isPaymentSubmitting, setIsPaymentSubmitting] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [rescheduleBookingTarget, setRescheduleBookingTarget] =
    useState<BookingListItem | null>(null)
  const [isRescheduleSubmitting, setIsRescheduleSubmitting] = useState(false)
  const [rescheduleError, setRescheduleError] = useState<string | null>(null)
  const selectedDate =
    dateFilters.find((filter) => filter.key === activeDateKey)?.date ??
    dateFilters[0].date
  const selectedCourt =
    courts.find((court) => court.id === selectedCourtId) ?? null
  const selectedWorkingHour = selectedCourt
    ? workingHours.find(
        (workingHour) =>
          workingHour.court === selectedCourt.id &&
          workingHour.weekday === getWeekdayFromDateValue(selectedDate),
      )
    : undefined
  const slotGeneration = selectedCourt
    ? generateSlotsFromWorkingHour(
        selectedWorkingHour,
        selectedCourt.slot_duration_minutes,
        bookings,
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
        const [courtsResponse, workingHoursResponse] = await Promise.all([
          listCourts(selectedClubSlug),
          listCourtWorkingHours(selectedClubSlug),
        ])
        const activeCourts = courtsResponse.results.filter(
          (court) => court.is_active,
        )
        const firstActiveCourt = activeCourts[0] ?? null

        if (isActive) {
          setCourts(activeCourts)
          setSelectedCourtId(firstActiveCourt?.id ?? null)
          setWorkingHours(workingHoursResponse.results)
          setSetupMessage(
            firstActiveCourt ? null : 'لا توجد ملاعب نشطة لعرض جدول الحجز',
          )
        }
      } catch {
        if (isActive) {
          setError('تعذر تحميل إعدادات جدول الحجز')
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
    } catch {
      setBookings([])
      setError('تعذر تحميل حجوزات اليوم')
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
      } catch {
        if (isActive) {
          setBookings([])
          setError('تعذر تحميل حجوزات اليوم')
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

    try {
      await createBooking(selectedClubSlug, {
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
    } catch {
      setCreateError('تعذر إنشاء الحجز. تأكد من البيانات وحاول مرة أخرى')
    } finally {
      setIsCreateSubmitting(false)
    }
  }

  async function handleCancelBooking(bookingId: number | string): Promise<void> {
    if (!selectedClubSlug || !selectedCourt) {
      return
    }

    setIsBookingActionSubmitting(true)
    setBookingActionError(null)

    try {
      await cancelBooking(selectedClubSlug, bookingId)
      setSelectedSlot(null)
      await reloadBookings()
    } catch {
      setBookingActionError('تعذر إلغاء الحجز. حاول مرة أخرى')
    } finally {
      setIsBookingActionSubmitting(false)
    }
  }

  async function handleCompleteBooking(
    bookingId: number | string,
  ): Promise<void> {
    if (!selectedClubSlug || !selectedCourt) {
      return
    }

    setIsBookingActionSubmitting(true)
    setBookingActionError(null)

    try {
      await completeBooking(selectedClubSlug, bookingId)
      setSelectedSlot(null)
      await reloadBookings()
    } catch {
      setBookingActionError('تعذر إكمال الحجز. حاول مرة أخرى')
    } finally {
      setIsBookingActionSubmitting(false)
    }
  }

  async function handleNoShowBooking(
    bookingId: number | string,
  ): Promise<void> {
    if (!selectedClubSlug || !selectedCourt) {
      return
    }

    setIsBookingActionSubmitting(true)
    setBookingActionError(null)

    try {
      await markBookingNoShow(selectedClubSlug, bookingId)
      setSelectedSlot(null)
      await reloadBookings()
    } catch {
      setBookingActionError('تعذر تسجيل عدم الحضور. حاول مرة أخرى')
    } finally {
      setIsBookingActionSubmitting(false)
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

    try {
      await createTransaction(selectedClubSlug, {
        booking: paymentBooking.id,
        amount: values.amount,
        payment_method: values.payment_method,
        ...(values.reference ? { reference: values.reference } : {}),
        ...(values.notes ? { notes: values.notes } : {}),
      })
      setPaymentBooking(null)
      setSelectedSlot(null)
      await reloadBookings()
    } catch {
      setPaymentError('تعذر تسجيل الدفعة. تأكد من البيانات وحاول مرة أخرى')
    } finally {
      setIsPaymentSubmitting(false)
    }
  }

  async function handleRescheduleBooking(slot: ScheduleBooking): Promise<void> {
    if (!selectedClubSlug || !selectedCourt || !rescheduleBookingTarget) {
      return
    }

    setIsRescheduleSubmitting(true)
    setRescheduleError(null)

    try {
      await rescheduleBooking(selectedClubSlug, rescheduleBookingTarget.id, {
        court: selectedCourt.id,
        start_time: formatBookingDateTime(selectedDate, slot.startTime),
        end_time: formatBookingDateTime(selectedDate, slot.endTime),
      })
      setRescheduleBookingTarget(null)
      setSelectedSlot(null)
      await reloadBookings()
    } catch {
      setRescheduleError('تعذر تغيير الموعد. تأكد أن الموعد متاح وحاول مرة أخرى')
    } finally {
      setIsRescheduleSubmitting(false)
    }
  }

  function handleCourtChange(nextCourtId: string): void {
    setSelectedCourtId(Number(nextCourtId))
    setSelectedSlot(null)
    setPaymentBooking(null)
    setRescheduleBookingTarget(null)
    setCreateError(null)
    setBookingActionError(null)
    setPaymentError(null)
    setRescheduleError(null)
  }

  function handleDateChange(nextDateKey: string): void {
    setActiveDateKey(nextDateKey)
    setSelectedSlot(null)
    setPaymentBooking(null)
    setRescheduleBookingTarget(null)
    setCreateError(null)
    setBookingActionError(null)
    setPaymentError(null)
    setRescheduleError(null)
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
    !isSetupLoading && !isBookingsLoading && !error && slots.length > 0
  const shouldShowBoardMessage =
    !isSetupLoading &&
    !isBookingsLoading &&
    !error &&
    Boolean(boardMessage) &&
    slots.length === 0
  const loadingMessage = isSetupLoading
    ? 'جاري تحميل إعدادات جدول الحجز...'
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
              اختر فترة متاحة أو ملغية لإضافة حجز، أو فترة مؤكدة لعرض التفاصيل
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
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
            isBookingsLoading ||
            error ||
            shouldShowBoardMessage ? (
              <div className="flex items-center justify-center rounded-3xl border border-white/20 bg-white/88 p-5 text-center md:col-span-2">
                <p className="text-sm font-bold text-[var(--sloty-text-primary)]">
                  {error ??
                    (isSetupLoading || isBookingsLoading
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
                      الفترة الصباحيه
                    </p>
                    <h3 className="text-lg font-black text-white">اليوم</h3>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 sm:gap-2 md:grid-cols-3 lg:grid-cols-4">
                    {daySlots.map((booking) => (
                      <BookingCard
                        booking={booking}
                        key={booking.id}
                        onSelect={setSelectedSlot}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex min-h-0 flex-col justify-between rounded-3xl border border-white/20 bg-slate-950/20 p-2 backdrop-blur-[1px] sm:p-3 md:p-4">
                  <div>
                    <p className="text-xs font-bold text-white/75">
                      الفترة المسائية
                    </p>
                    <h3 className="text-lg font-black text-white">المساء</h3>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 sm:gap-2 md:grid-cols-3 lg:grid-cols-4">
                    {nightSlots.map((booking) => (
                      <BookingCard
                        booking={booking}
                        key={booking.id}
                        onSelect={setSelectedSlot}
                      />
                    ))}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </section>
      </div>

      {selectedSlot &&
      selectedSlot.status !== 'confirmed' &&
      selectedCourt ? (
        <AddBookingSheet
          courtName={selectedCourt.name}
          dateLabel={scheduleCourt.dateLabel}
          endTime={selectedSlot.endTime}
          error={createError}
          isSubmitting={isCreateSubmitting}
          onClose={() => {
            setSelectedSlot(null)
            setCreateError(null)
          }}
          onSubmit={handleCreateBooking}
          startTime={selectedSlot.startTime}
        />
      ) : null}

      {selectedSlot?.status === 'confirmed' ? (
        <BookingDetailsSheet
          booking={selectedSlot.booking}
          courtName={selectedCourt?.name ?? 'لا يوجد ملعب'}
          dateLabel={scheduleCourt.dateLabel}
          error={bookingActionError}
          isSubmitting={isBookingActionSubmitting}
          onAddPayment={(booking) => {
            setPaymentBooking(booking)
            setPaymentError(null)
          }}
          onCancel={handleCancelBooking}
          onComplete={handleCompleteBooking}
          onClose={() => {
            setSelectedSlot(null)
            setBookingActionError(null)
            setPaymentBooking(null)
            setPaymentError(null)
            setRescheduleBookingTarget(null)
            setRescheduleError(null)
          }}
          onNoShow={handleNoShowBooking}
          onReschedule={(booking) => {
            setRescheduleBookingTarget(booking)
            setRescheduleError(null)
          }}
          slot={selectedSlot}
        />
      ) : null}

      {paymentBooking ? (
        <RecordPaymentSheet
          bookingId={paymentBooking.id}
          error={paymentError}
          isSubmitting={isPaymentSubmitting}
          onClose={() => {
            setPaymentBooking(null)
            setPaymentError(null)
          }}
          onSubmit={handleRecordPayment}
        />
      ) : null}

      {rescheduleBookingTarget && selectedCourt ? (
        <RescheduleBookingSheet
          bookingId={rescheduleBookingTarget.id}
          courtName={selectedCourt.name}
          currentSlotId={selectedSlot?.id}
          dateLabel={scheduleCourt.dateLabel}
          error={rescheduleError}
          isSubmitting={isRescheduleSubmitting}
          onClose={() => {
            setRescheduleBookingTarget(null)
            setRescheduleError(null)
          }}
          onSubmit={handleRescheduleBooking}
          slots={slots}
        />
      ) : null}
    </div>
  )
}
