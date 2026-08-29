import { normalizeTimeString } from '../courts/components/CourtWorkingHoursSection/courtWorkingHours.helpers'
import type { BookingBoardPeriod, ScheduleBooking } from './schedule.types'
import type {
  BookingListItem,
  BookingSlot,
  BookingSlotsResponse,
} from './scheduleApi.types'

/**
 * Schedule board mapping helpers.
 *
 * Slot availability comes from the backend slots API. This module maps those
 * slots into compact board cards and derives the today-only closing list.
 */
export interface ScheduleClosingBookingsResult {
  items: BookingListItem[]
  totalCount: number
}

const bookingSlotStatusToBoardStatus: Record<
  BookingSlot['slot_status'],
  ScheduleBooking['status']
> = {
  FREE: 'available',
  UNAVAILABLE: 'unavailable',
  RECURRING_RESERVED: 'recurring_reserved',
  HOLD: 'hold',
  CONFIRMED: 'confirmed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show',
  EXPIRED: 'available',
}

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

/** Converts a backend instant to the Egypt-local `YYYY-MM-DD` calendar date. */
export function getEgyptDateValueFromInstant(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) {
    return getEgyptDateValue()
  }

  return getEgyptDateValue(date)
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

function getTimeValue(value: string): string {
  const timePart = value.includes('T') ? value.split('T')[1] : value

  return normalizeTimeString(timePart.slice(0, 5))
}

function getSlotBookingDateTime(dateValue: string, timeValue: string): string {
  return timeValue.includes('T') ? timeValue : formatBookingDateTime(dateValue, timeValue)
}

export function mapBookingSlotToScheduleBooking(
  slot: BookingSlot,
  courtId: number,
): ScheduleBooking {
  const startTime = getTimeValue(slot.start_time)
  const endTime = getTimeValue(slot.end_time)
  const startMinutes = timeToMinutes(startTime) ?? 0
  const booking = slot.booking
    ? {
        id: slot.booking.id,
        court: courtId,
        customer_name: slot.booking.customer_name,
        customer_phone: slot.booking.customer_phone,
        start_time: getSlotBookingDateTime(slot.date, startTime),
        end_time: getSlotBookingDateTime(slot.date, endTime),
        status: slot.booking.status,
        total_price: slot.booking.total_booking_value,
        paid_amount: slot.booking.total_paid_amount,
        remaining_amount: slot.booking.remaining_amount,
        ...(slot.booking.source ? { source: slot.booking.source } : {}),
        is_recurring: slot.booking.is_recurring,
        recurrence_status: slot.booking.recurrence_status,
        previous_recurring_booking_id: null,
        next_recurring_booking_id: null,
      }
    : undefined

  return {
    id: [
      'backend-slot',
      slot.date,
      startTime.replace(':', ''),
      endTime.replace(':', ''),
    ].join('-'),
    date: slot.date,
    status: bookingSlotStatusToBoardStatus[slot.slot_status],
    label: slot.label,
    isAvailable: slot.is_available,
    slotPrice: slot.slot_price,
    canStartRecurring: slot.can_start_recurring,
    recurringAnchorBookingId: slot.recurring_anchor_booking_id,
    recurringContext: slot.recurring_context,
    recurringBlockedReason: slot.recurring_blocked_reason,
    firstRecurringConflictStart: slot.first_recurring_conflict_start,
    startTime,
    endTime,
    period: getSlotPeriod(startMinutes),
    ...(booking ? { booking } : {}),
  }
}

export function mapBookingSlotsResponseToScheduleBookings(
  response: BookingSlotsResponse,
): ScheduleBooking[] {
  return response.slots.map((slot) =>
    mapBookingSlotToScheduleBooking(slot, response.court),
  )
}

export function getBookingSummariesFromScheduleSlots(
  slots: ScheduleBooking[],
): BookingListItem[] {
  return slots
    .map((slot) => slot.booking)
    .filter((booking): booking is BookingListItem => Boolean(booking))
}

function hasPositiveRemainingAmount(booking: BookingListItem): boolean {
  const remainingAmount = Number(booking.remaining_amount ?? 0)

  return Number.isFinite(remainingAmount) && remainingAmount > 0
}

function getBookingEndMinutes(booking: BookingListItem): number {
  return timeToMinutes(booking.end_time) ?? -1
}

function isEndedBooking(booking: BookingListItem, now = new Date()): boolean {
  const endMinutes = timeToMinutes(booking.end_time)

  return endMinutes !== null && endMinutes < getEgyptCurrentMinutes(now)
}

function getClosingBookingPriority(
  booking: BookingListItem,
  now = new Date(),
): number {
  if (booking.status === 'CONFIRMED' && isEndedBooking(booking, now)) {
    return 0
  }

  if (booking.status === 'HOLD' && isEndedBooking(booking, now)) {
    return 1
  }

  if (hasPositiveRemainingAmount(booking)) {
    return 2
  }

  return 3
}

/**
 * Local Schedule grouping for `تحتاج إغلاق`.
 *
 * Only HOLD/CONFIRMED bookings that still need payment or a complete/no-show
 * decision belong here. NO_SHOW and COMPLETED are already closed
 * operationally, even when remaining money exists. CANCELLED and EXPIRED never
 * belong in this group. EXPIRED may still appear in History `تحتاج إجراء`
 * through backend `needs_action`; do not reuse this helper for that filter.
 */
function shouldIncludeClosingBooking(
  booking: BookingListItem,
  now = new Date(),
): boolean {
  if (
    booking.status === 'CANCELLED' ||
    booking.status === 'EXPIRED' ||
    booking.status === 'NO_SHOW' ||
    booking.status === 'COMPLETED'
  ) {
    return false
  }

  if (booking.status === 'CONFIRMED' || booking.status === 'HOLD') {
    return isEndedBooking(booking, now) || hasPositiveRemainingAmount(booking)
  }

  return false
}

export function getScheduleClosingBookings(
  bookings: BookingListItem[],
  selectedDate: string,
  now = new Date(),
): ScheduleClosingBookingsResult {
  if (!isTodayInEgypt(selectedDate, now)) {
    return {
      items: [],
      totalCount: 0,
    }
  }

  const matchingBookings = bookings
    .filter((booking) => shouldIncludeClosingBooking(booking, now))
    .sort((firstBooking, secondBooking) => {
      const priorityDifference =
        getClosingBookingPriority(firstBooking, now) -
        getClosingBookingPriority(secondBooking, now)

      if (priorityDifference !== 0) {
        return priorityDifference
      }

      return getBookingEndMinutes(secondBooking) - getBookingEndMinutes(firstBooking)
    })

  return {
    items: matchingBookings.slice(0, 3),
    totalCount: matchingBookings.length,
  }
}

export function getSlotPeriod(startMinutes: number): BookingBoardPeriod {
  return startMinutes < PM_START_MINUTES ? 'am' : 'pm'
}
