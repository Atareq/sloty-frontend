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
  'NO_SHOW',
  'EXPIRED',
])

const activeSlotStatusPriority = [
  'COMPLETED',
  'CONFIRMED',
  'HOLD',
  'CANCELLED',
] as const

const EGYPT_TIME_ZONE = 'Africa/Cairo'
export const PM_START_MINUTES = 12 * 60

function padTimePart(value: number): string {
  return String(value).padStart(2, '0')
}

function getEgyptDateParts(
  now: Date,
): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    month: '2-digit',
    timeZone: EGYPT_TIME_ZONE,
    year: 'numeric',
  }).formatToParts(now)
  const getPart = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value)

  return {
    year: getPart('year'),
    month: getPart('month'),
    day: getPart('day'),
  }
}

export function getEgyptDateValue(now = new Date()): string {
  const { year, month, day } = getEgyptDateParts(now)

  return [
    year,
    padTimePart(month),
    padTimePart(day),
  ].join('-')
}

export function getEgyptDateValueOffset(
  daysOffset: number,
  now = new Date(),
): string {
  const { year, month, day } = getEgyptDateParts(now)
  const offsetDate = new Date(Date.UTC(year, month - 1, day + daysOffset, 12))

  return getEgyptDateValue(offsetDate)
}

export function getEgyptCurrentMinutes(now = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    hour12: false,
    minute: '2-digit',
    timeZone: EGYPT_TIME_ZONE,
  }).formatToParts(now)
  const getPart = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value)

  return getPart('hour') * 60 + getPart('minute')
}

export function isPastEgyptDate(dateValue: string, now = new Date()): boolean {
  return dateValue < getEgyptDateValue(now)
}

export function isTodayInEgypt(dateValue: string, now = new Date()): boolean {
  return dateValue === getEgyptDateValue(now)
}

export function isPastSlot(
  selectedDate: string,
  slotEndTime: string,
  now = new Date(),
): boolean {
  if (isPastEgyptDate(selectedDate, now)) {
    return true
  }

  if (!isTodayInEgypt(selectedDate, now)) {
    return false
  }

  const slotEndMinutes = timeToMinutes(slotEndTime)

  return slotEndMinutes === null || slotEndMinutes <= getEgyptCurrentMinutes(now)
}

/**
 * Formats a backend 24-hour time value for Arabic UI display.
 *
 * Examples:
 * 00:00 -> 12:00 ص
 * 09:30 -> 9:30 ص
 * 12:00 -> 12:00 م
 * 18:30 -> 6:30 م
 *
 * This must only be used for display. API and calculation values remain
 * in the original 24-hour format.
 */
export function formatTime12Hour(time: string): string {
  const totalMinutes = timeToMinutes(time)

  if (totalMinutes === null) {
    return time
  }

  const hours24 = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  const hours12 = hours24 % 12 || 12
  const period = hours24 < 12 ? 'ص' : 'م'

  return `${hours12}:${padTimePart(minutes)} ${period}`
}

export function createDateFilterOptions(today = new Date()): DateFilterOption[] {
  return [
    { key: 'today', label: 'اليوم', date: getEgyptDateValueOffset(0, today) },
    {
      key: 'tomorrow',
      label: 'غداً',
      date: getEgyptDateValueOffset(1, today),
    },
    {
      key: 'afterTomorrow',
      label: 'بعد غد',
      date: getEgyptDateValueOffset(2, today),
    },
  ]
}

export function getWeekdayFromDateValue(
  dateValue: string,
): CourtWorkingHour['weekday'] {
  return getCourtWeekdayFromDate(dateValue)
}

export function formatBookingDateTime(
  dateValue: string,
  timeValue: string,
): string {
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

export function getSlotPeriod(startMinutes: number): BookingBoardPeriod {
  return startMinutes < PM_START_MINUTES ? 'am' : 'pm'
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

  if (overlappingBooking?.status === 'COMPLETED') {
    return 'completed'
  }

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
  selectedDate?: string,
  now = new Date(),
): SlotGenerationResult {
  if (selectedDate && isPastEgyptDate(selectedDate, now)) {
    return {
      slots: [],
      message: 'لا يمكن حجز مواعيد سابقة',
    }
  }

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
  let hiddenPastSlotCount = 0

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

        if (selectedDate && isPastSlot(selectedDate, endTime, now)) {
          hiddenPastSlotCount += 1
          continue
        }

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
          period: getSlotPeriod(slotStart),
          ...(booking ? { booking } : {}),
        })
      }
    },
  )

  if (slots.length === 0) {
    return {
      slots,
      message:
        selectedDate &&
        hiddenPastSlotCount > 0 &&
        isTodayInEgypt(selectedDate, now)
          ? 'لا توجد مواعيد متاحة بعد الوقت الحالي'
          : 'لم يتم ضبط مواعيد العمل لهذا اليوم',
    }
  }

  return {
    slots,
    message: null,
  }
}
