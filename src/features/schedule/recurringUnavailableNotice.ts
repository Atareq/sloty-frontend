import { recurringCopy } from '../../shared/copy/appCopy'
import { formatArabicConflictMoment } from '../../shared/utils/date'

export interface RecurringUnavailableNotice {
  title: string
  message: string
}

/**
 * Builds the floating warning copy for online `RECURRING_UNAVAILABLE` rejects.
 *
 * Shows the first future conflict when Backend provides `first_conflict_start`.
 * Never surfaces `conflicting_booking_id`.
 */
export function buildRecurringUnavailableNotice(
  details: Record<string, unknown> | null,
): RecurringUnavailableNotice {
  const firstConflictStart =
    typeof details?.first_conflict_start === 'string'
      ? details.first_conflict_start
      : null
  const whenLabel = formatArabicConflictMoment(firstConflictStart)

  return {
    title: recurringCopy.unavailableTitle,
    message: whenLabel
      ? recurringCopy.unavailableConflict(whenLabel)
      : recurringCopy.unavailableFallback,
  }
}
