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
