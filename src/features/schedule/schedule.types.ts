import type {
  BookingListItem,
  RecurringSlotContext,
} from './scheduleApi.types'

export type BookingBoardSlotStatus =
  | 'available'
  | 'unavailable'
  | 'recurring_reserved'
  | 'hold'
  | 'confirmed'
  | 'completed'
  | 'no_show'
  | 'cancelled'
export type BookingBoardPeriod = 'am' | 'pm'

/**
 * UI-only shape for the staff schedule preview.
 *
 * Booking Board slots intentionally expose only availability state and their
 * time range. HOLD and completed slots are visible because they block
 * availability, while payment and lifecycle details stay inside focused sheets.
 *
 * RECURRING_RESERVED slots stay virtual: occurrence identity comes from this
 * slot, while recurrence owner identity comes from recurringContext.
 */
export interface ScheduleBooking {
  id: string
  date?: string
  status: BookingBoardSlotStatus
  label?: string | null
  isAvailable?: boolean
  startTime: string
  endTime: string
  /**
   * Backend timezone-aware slot bounds, kept as returned. They carry the real
   * calendar day of each bound, so an overnight slot (23:00 → 00:00) keeps its
   * next-day end. Absent when the slot only has wall-clock times.
   */
  startDateTime?: string
  endDateTime?: string
  slotPrice?: string | null
  canStartRecurring?: boolean | null
  recurringAnchorBookingId?: number | null
  recurringContext?: RecurringSlotContext | null
  recurringBlockedReason?: string | null
  firstRecurringConflictStart?: string | null
  period: BookingBoardPeriod
  booking?: BookingListItem
}

export interface ScheduleSummary {
  availableCount: number
  confirmedCount: number
  totalSlots: number
}
