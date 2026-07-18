import {
  isSameDayValidBlock,
  normalizeTimeString,
  sortBlocksByStartTime,
  getCourtWeekdayFromDate,
} from '../courts/components/CourtWorkingHoursSection/courtWorkingHours.helpers'
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
  'COMPLETED',
  'NO_SHOW',
  'EXPIRED',
])

const activeSlotStatusPriority = ['CONFIRMED', 'HOLD', 'CANCELLED'] as const

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
  const overlappingBooking = getSlotBooking(visibleBookings, slotStart, slotEnd)

  if (overlappingBooking?.status === 'CONFIRMED') {
    return 'confirmed'
  }

  if (overlappingBooking?.status === 'HOLD') {
    return 'hold'
  }

  if (overlappingBooking?.status === 'CANCELLED') {
    return 'cancelled'
  }

  if (
    visibleBookings.some((booking) =>
      bookingOverlapsSlot(booking, slotStart, slotEnd),
    )
  ) {
    return 'hold'
  }

  return 'available'
}

function getSlotBooking(
  bookings: BookingListItem[],
  slotStart: number,
  slotEnd: number,
): BookingListItem | undefined {
  const visibleBookings = getVisibleBookings(bookings)
  const prioritizedBooking = activeSlotStatusPriority
    .map((status) =>
      visibleBookings.find(
        (booking) =>
          booking.status === status &&
          bookingOverlapsSlot(booking, slotStart, slotEnd),
      ),
    )
    .find(Boolean)

  if (prioritizedBooking) {
    return prioritizedBooking
  }

  return visibleBookings.find((booking) =>
    bookingOverlapsSlot(booking, slotStart, slotEnd),
  )
}

export function generateSlotsFromWorkingHour(
  workingHour: CourtWorkingHour | undefined,
  slotDurationMinutes: number,
  bookings: BookingListItem[] = [],
): SlotGenerationResult {
  if (!workingHour) {
    return {
      slots: [],
      message: 'لم يتم ضبط مواعيد العمل لهذا اليوم',
    }
  }

  const safeBlocks = Array.isArray(workingHour.blocks)
    ? workingHour.blocks
    : []

  const safeBookings = Array.isArray(bookings)
    ? bookings
    : []

  if (workingHour.is_closed) {
    return {
      slots: [],
      message: 'الملعب مغلق في هذا اليوم',
    }
  }

  if (safeBlocks.length === 0) {
    return {
      slots: [],
      message: 'لم يتم ضبط مواعيد العمل لهذا اليوم',
    }
  }

  const duration =
    Number.isFinite(slotDurationMinutes) &&
    slotDurationMinutes > 0
      ? slotDurationMinutes
      : 60

  const slots: ScheduleBooking[] = []

  sortBlocksByStartTime(safeBlocks).forEach(
    (block, blockIndex) => {
      if (!isSameDayValidBlock(block)) {
        return
      }

      const startsAt = timeToMinutes(block.start_time)
      const endsAt = timeToMinutes(block.end_time)

      if (startsAt === null || endsAt === null) {
        return
      }

      for (
        let slotStart = startsAt;
        slotStart + duration <= endsAt;
        slotStart += duration
      ) {
        const slotEnd = slotStart + duration
        const startTime = minutesToTime(slotStart)
        const endTime = minutesToTime(slotEnd)

        const booking = getSlotBooking(
          safeBookings,
          slotStart,
          slotEnd,
        )

        slots.push({
          id: [
            'slot',
            blockIndex,
            normalizeTimeString(startTime).replace(':', ''),
          ].join('-'),
          status: getSlotStatus(
            safeBookings,
            slotStart,
            slotEnd,
          ),
          startTime,
          endTime,
          period: getPeriod(slotStart),
          ...(booking ? { booking } : {}),
        })
      }
    },
  )

  if (slots.length === 0) {
    return {
      slots,
      message: 'لم يتم ضبط مواعيد العمل لهذا اليوم',
    }
  }

  return {
    slots,
    message: null,
  }
}
