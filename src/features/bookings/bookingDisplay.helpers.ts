import type {
  BackendBookingStatus,
  BookingListItem,
} from '../schedule/scheduleApi.types'
import { hasPositiveRemainingAmount } from './bookingPayment.helpers'

const arabicDateTimeFormatter = new Intl.DateTimeFormat('ar-EG', {
  day: 'numeric',
  month: 'long',
  timeZone: 'Africa/Cairo',
  weekday: 'long',
})

const arabicTimeFormatter = new Intl.DateTimeFormat('ar-EG', {
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'Africa/Cairo',
})

export const bookingStatusLabels: Record<BackendBookingStatus, string> = {
  HOLD: 'بانتظار العربون',
  CONFIRMED: 'مؤكد',
  COMPLETED: 'مكتمل',
  CANCELLED: 'ملغي',
  NO_SHOW: 'لم يحضر',
  EXPIRED: 'منتهي',
}

function getOptionalBookingField(
  booking: BookingListItem,
  key: string,
): string | number | null {
  const value = (booking as unknown as Record<string, unknown>)[key]

  if (typeof value === 'string' || typeof value === 'number') {
    return value
  }

  return null
}

function getBookingDateCandidate(booking: BookingListItem): string | null {
  const date = getOptionalBookingField(booking, 'date')

  return date ? String(date) : null
}

function parseBookingDateTime(
  value: string,
  fallbackDate?: string | null,
): Date | null {
  const dateTimeValue =
    value.includes('T') || !fallbackDate ? value : `${fallbackDate}T${value}`
  const date = new Date(dateTimeValue)

  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * Formats booking time with weekday context for operational review surfaces.
 */
export function formatBookingDateTimeRangeWithWeekday(
  startTime: string,
  endTime: string,
  fallbackDate?: string | null,
): string {
  const startDate = parseBookingDateTime(startTime, fallbackDate)
  const endDate = parseBookingDateTime(endTime, fallbackDate)

  if (!startDate || !endDate) {
    return `${startTime} - ${endTime}`
  }

  return `${arabicDateTimeFormatter.format(startDate)} · ${arabicTimeFormatter.format(
    startDate,
  )} - ${arabicTimeFormatter.format(endDate)}`
}

export function getBookingCourtLabel(
  booking: BookingListItem,
  explicitCourtName?: string | null,
): string {
  if (explicitCourtName) {
    return explicitCourtName
  }

  const courtName = getOptionalBookingField(booking, 'court_name')

  if (courtName) {
    return String(courtName)
  }

  return `ملعب #${booking.court}`
}

export function getBookingNotes(booking: BookingListItem): string | null {
  const notes = getOptionalBookingField(booking, 'notes')

  return notes ? String(notes) : null
}

export function getBookingDateFallback(booking: BookingListItem): string | null {
  return getBookingDateCandidate(booking)
}

export function hasRemainingAmount(booking: BookingListItem): boolean {
  return hasPositiveRemainingAmount(booking.remaining_amount)
}

/**
 * Formats the backend-owned HOLD deadline without making lifecycle decisions.
 * A missing/invalid value stays silent because Court policy is not a deadline.
 */
export function formatHoldExpiryMessage(
  holdExpiresAt: string | null | undefined,
  now = new Date(),
): string | null {
  if (!holdExpiresAt) {
    return null
  }

  const deadline = new Date(holdExpiresAt)

  if (Number.isNaN(deadline.getTime())) {
    return null
  }

  const remainingMinutes = Math.ceil(
    (deadline.getTime() - now.getTime()) / (60 * 1000),
  )

  if (remainingMinutes <= 0) {
    return 'انتهت مهلة دفع العربون'
  }

  if (remainingMinutes < 60) {
    return `باقي ${remainingMinutes} دقيقة قبل إلغاء الحجز تلقائيًا`
  }

  const remainingHours = Math.ceil(remainingMinutes / 60)

  return remainingHours === 2
    ? 'هيتلغي تلقائي بعد ساعتين'
    : `هيتلغي تلقائي بعد ${remainingHours} ساعات`
}

export function isBookingReadOnlyStatus(status: BackendBookingStatus): boolean {
  return ['COMPLETED', 'CANCELLED', 'NO_SHOW', 'EXPIRED'].includes(status)
}

export function canBookingAddPayment(status: BackendBookingStatus): boolean {
  return status === 'HOLD' || status === 'CONFIRMED'
}

export function canBookingComplete(status: BackendBookingStatus): boolean {
  return status === 'CONFIRMED'
}

export function canBookingNoShow(status: BackendBookingStatus): boolean {
  return status === 'CONFIRMED'
}

export function canBookingCancel(status: BackendBookingStatus): boolean {
  return status === 'CONFIRMED'
}

export function canBookingFreeHold(status: BackendBookingStatus): boolean {
  return status === 'HOLD'
}
