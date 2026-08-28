import type { BookingListItem } from '../schedule/scheduleApi.types'

/**
 * Returns whether a booking currently owns an active weekly recurrence.
 *
 * Backend lifecycle actions remain authoritative; this helper is presentation
 * logic for warnings and available actions only.
 */
export function hasActiveRecurrence(
  booking: Pick<BookingListItem, 'is_recurring' | 'recurrence_status'>,
): boolean {
  return booking.is_recurring && booking.recurrence_status === 'ACTIVE'
}

/**
 * Recurrence-next is a dedicated GET, not a Booking payload field.
 *
 * Only CONFIRMED + active recurrence may load it. Remaining-amount gating
 * belongs to the completion sheet so unpaid bookings never fetch preview.
 */
export function shouldLoadRecurrenceNextPreview(
  booking: Pick<
    BookingListItem,
    'status' | 'is_recurring' | 'recurrence_status'
  >,
): boolean {
  return booking.status === 'CONFIRMED' && hasActiveRecurrence(booking)
}

const recurrencePreviewRefreshCodes = new Set([
  'BOOKING_RECURRENCE_NOT_ACTIVE',
  'RECURRENCE_CANNOT_CONTINUE',
  'NEXT_RECURRING_SLOT_UNAVAILABLE',
  'BOOKING_SLOT_UNAVAILABLE',
])

/** Complete-time recurrence conflicts must refetch preview, not local dates. */
export function shouldRefreshRecurrencePreview(
  errorCode: string | null,
): boolean {
  return errorCode !== null && recurrencePreviewRefreshCodes.has(errorCode)
}

const recurrenceBlockedReasonMessages: Readonly<Record<string, string>> = {
  SLOT_UNAVAILABLE: 'نفس الموعد الأسبوع القادم مش متاح.',
  COURT_UNAVAILABLE: 'الملعب مش متاح في الموعد الأسبوع القادم.',
  OUTSIDE_WORKING_HOURS: 'الموعد الأسبوع القادم خارج مواعيد عمل الملعب.',
  RECURRENCE_ENDED: 'التكرار الأسبوعي مش نشط دلوقتي.',
}

/** Maps backend continuation reasons to product copy without exposing enums. */
export function getRecurrenceBlockedReasonMessage(
  reason: string | null | undefined,
): string {
  return reason
    ? recurrenceBlockedReasonMessages[reason] ??
        'مش متاح استمرار نفس الموعد الأسبوع القادم.'
    : 'مش متاح استمرار نفس الموعد الأسبوع القادم.'
}
