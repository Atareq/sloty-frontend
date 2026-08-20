import {
  isTimeRangeOrdered,
  normalizeTimeString,
  getCourtWeekdayFromDate,
  sortPeriodsByStartTime,
} from '../courts/components/CourtWorkingHoursSection/courtWorkingHours.helpers'
import type { CourtWorkingDay } from '../courts/courtWorkingHours.types'
import type { BookingBoardPeriod, ScheduleBooking } from './schedule.types'
import type {
  BookingListItem,
  BookingSlot,
  BookingSlotsResponse,
} from './scheduleApi.types'

interface DateFilterOption {
  key: string
  label: string
  date: string
}

export interface SlotGenerationResult {
  slots: ScheduleBooking[]
  message: string | null
}

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
  HOLD: 'hold',
  CONFIRMED: 'confirmed',
  COMPLETED: 'completed',
  NO_SHOW: 'no_show',
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
): CourtWorkingDay['weekday'] {
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
        ...(slot.booking.is_recurring === undefined
          ? {}
          : { is_recurring: slot.booking.is_recurring }),
        ...(slot.booking.recurring_agreement_id === undefined
          ? {}
          : { recurring_agreement_id: slot.booking.recurring_agreement_id }),
      }
    : undefined

  return {
    id: [
      'backend-slot',
      slot.date,
      startTime.replace(':', ''),
      endTime.replace(':', ''),
    ].join('-'),
    status: bookingSlotStatusToBoardStatus[slot.slot_status],
    label: slot.label,
    isAvailable: slot.is_available,
    slotPrice: slot.slot_price,
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

function shouldIncludeClosingBooking(
  booking: BookingListItem,
  now = new Date(),
): boolean {
  if (booking.status === 'CANCELLED' || booking.status === 'EXPIRED') {
    return false
  }

  if (booking.status === 'CONFIRMED') {
    return isEndedBooking(booking, now) || hasPositiveRemainingAmount(booking)
  }

  if (booking.status === 'HOLD') {
    return isEndedBooking(booking, now) || hasPositiveRemainingAmount(booking)
  }

  if (booking.status === 'COMPLETED') {
    return hasPositiveRemainingAmount(booking)
  }

  return hasPositiveRemainingAmount(booking)
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
  workingHour: CourtWorkingDay | undefined,
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

  const safeBookings = Array.isArray(bookings)
    ? bookings
    : []
  const pricingPeriods = Array.isArray(workingHour.pricing_periods)
    ? workingHour.pricing_periods
    : []

  if (pricingPeriods.length === 0) {
    return {
      slots: [],
      message: 'الملعب مغلق في هذا اليوم',
    }
  }

  const duration =
    Number.isFinite(slotDurationMinutes) &&
    slotDurationMinutes > 0
      ? slotDurationMinutes
      : 60

  const slots: ScheduleBooking[] = []
  let hiddenPastSlotCount = 0
  const validPeriods = sortPeriodsByStartTime(pricingPeriods)
    .filter((period) => isTimeRangeOrdered(period))

  if (validPeriods.length === 0) {
    return {
      slots: [],
      message: 'لم يتم ضبط مواعيد العمل لهذا اليوم',
    }
  }

  validPeriods.forEach((period, periodIndex) => {
    const startsAt = timeToMinutes(period.starts_at)
    const endsAt = timeToMinutes(period.ends_at)

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
          periodIndex,
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
  })

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
