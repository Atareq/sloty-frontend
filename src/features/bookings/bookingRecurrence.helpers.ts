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
