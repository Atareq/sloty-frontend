import { getCourtWeekdayFromDate } from '../courts/components/CourtWorkingHoursSection/courtWorkingHours.helpers'
import type { CourtWorkingHour } from '../courts/courtWorkingHours.types'
import type { BookingBoardPeriod, ScheduleBooking } from './schedule.types'
import type { BookingListItem } from './scheduleApi.types'

interface DateFilterOption {
  key: string
  label: string
  date: string
}

export interface SlotGenerationResult {
  slots: ScheduleBooking[]
  message: string | null
}

const hiddenBookingStatuses = new Set([
  'HOLD',
  'COMPLETED',
  'NO_SHOW',
  'EXPIRED',
])

function padTimePart(value: number): string {
  return String(value).padStart(2, '0')
}

function toDateInputValue(date: Date): string {
  return [
    date.getFullYear(),
    padTimePart(date.getMonth() + 1),
    padTimePart(date.getDate()),
  ].join('-')
}

function addDays(date: Date, days: number): Date {
  const nextDate = new Date(date)
  nextDate.setDate(date.getDate() + days)

  return nextDate
}

export function createDateFilterOptions(today = new Date()): DateFilterOption[] {
  return [
    { key: 'today', label: 'اليوم', date: toDateInputValue(today) },
    { key: 'tomorrow', label: 'غداً', date: toDateInputValue(addDays(today, 1)) },
    {
      key: 'afterTomorrow',
      label: 'بعد غد',
      date: toDateInputValue(addDays(today, 2)),
    },
  ]
}

export function getWeekdayFromDateValue(dateValue: string): CourtWorkingHour['weekday'] {
  return getCourtWeekdayFromDate(dateValue)
}

export function formatBookingDateTime(dateValue: string, timeValue: string): string {
  return `${dateValue}T${timeValue}:00`
}

function timeToMinutes(time: string): number | null {
  const timePart = time.includes('T') ? time.split('T')[1] : time
  const [hours, minutes] = timePart.split(':').map(Number)

  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null
  }

  return hours * 60 + minutes
}

function minutesToTime(minutes: number): string {
  return `${padTimePart(Math.floor(minutes / 60))}:${padTimePart(minutes % 60)}`
}

function getPeriod(startMinutes: number): BookingBoardPeriod {
  return startMinutes < 18 * 60 ? 'day' : 'night'
}

function bookingOverlapsSlot(
  booking: BookingListItem,
  slotStart: number,
  slotEnd: number,
): boolean {
  const bookingStart = timeToMinutes(booking.start_time)
  const bookingEnd = timeToMinutes(booking.end_time)

  if (bookingStart === null || bookingEnd === null) {
    return false
  }

  return bookingStart < slotEnd && bookingEnd > slotStart
}

export function getVisibleBookings(bookings: BookingListItem[]): BookingListItem[] {
  return bookings.filter((booking) => !hiddenBookingStatuses.has(booking.status))
}

function getSlotStatus(
  bookings: BookingListItem[],
  slotStart: number,
  slotEnd: number,
): ScheduleBooking['status'] {
  const visibleBookings = getVisibleBookings(bookings)

  if (
    visibleBookings.some(
      (booking) =>
        booking.status === 'CONFIRMED' &&
        bookingOverlapsSlot(booking, slotStart, slotEnd),
    )
  ) {
    return 'confirmed'
  }

  if (
    visibleBookings.some(
      (booking) =>
        booking.status === 'CANCELLED' &&
        bookingOverlapsSlot(booking, slotStart, slotEnd),
    )
  ) {
    return 'cancelled'
  }

  return 'available'
}

function getSlotBooking(
  bookings: BookingListItem[],
  slotStart: number,
  slotEnd: number,
): BookingListItem | undefined {
  const visibleBookings = getVisibleBookings(bookings)
  const confirmedBooking = visibleBookings.find(
    (booking) =>
      booking.status === 'CONFIRMED' &&
      bookingOverlapsSlot(booking, slotStart, slotEnd),
  )

  if (confirmedBooking) {
    return confirmedBooking
  }

  return visibleBookings.find(
    (booking) =>
      booking.status === 'CANCELLED' &&
      bookingOverlapsSlot(booking, slotStart, slotEnd),
  )
}

export function generateSlotsFromWorkingHour(
  workingHour: CourtWorkingHour | undefined,
  slotDurationMinutes: number,
  bookings: BookingListItem[],
): SlotGenerationResult {
  if (!workingHour) {
    return { slots: [], message: 'لم يتم ضبط مواعيد العمل لهذا اليوم' }
  }

  if (workingHour.is_closed) {
    return { slots: [], message: 'الملعب مغلق في هذا اليوم' }
  }

  if (!workingHour.opens_at || !workingHour.closes_at) {
    return { slots: [], message: 'لم يتم ضبط مواعيد العمل لهذا اليوم' }
  }

  const opensAt = timeToMinutes(workingHour.opens_at)
  const closesAt = timeToMinutes(workingHour.closes_at)
  const duration =
    Number.isFinite(slotDurationMinutes) && slotDurationMinutes > 0
      ? slotDurationMinutes
      : 60

  if (opensAt === null || closesAt === null) {
    return { slots: [], message: 'لم يتم ضبط مواعيد العمل لهذا اليوم' }
  }

  if (closesAt <= opensAt) {
    return { slots: [], message: 'نطاق ساعات العمل غير مدعوم بعد لهذا اليوم' }
  }

  const slots: ScheduleBooking[] = []

  for (let slotStart = opensAt; slotStart + duration <= closesAt; slotStart += duration) {
    const slotEnd = slotStart + duration
    const startTime = minutesToTime(slotStart)
    const endTime = minutesToTime(slotEnd)
    const booking = getSlotBooking(bookings, slotStart, slotEnd)

    slots.push({
      id: `slot-${startTime.replace(':', '')}`,
      status: getSlotStatus(bookings, slotStart, slotEnd),
      startTime,
      endTime,
      period: getPeriod(slotStart),
      ...(booking ? { booking } : {}),
    })
  }

  return { slots, message: slots.length > 0 ? null : 'لم يتم ضبط مواعيد العمل لهذا اليوم' }
}
