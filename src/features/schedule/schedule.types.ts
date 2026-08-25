import type { BookingListItem } from './scheduleApi.types'

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
export interface ScheduleStaff {
  name: string
  role: string
}

export interface ScheduleCourt {
  clubName: string
  courtName: string
  dateLabel: string
}

export interface ScheduleDateFilter {
  key: string
  label: string
}

/**
 * UI-only shape for the staff schedule preview.
 *
 * Booking Board slots intentionally expose only availability state and their
 * time range. HOLD and completed slots are visible because they block
 * availability, while payment and lifecycle details stay inside focused sheets.
 */
export interface ScheduleBooking {
  id: string
  status: BookingBoardSlotStatus
  label?: string | null
  isAvailable?: boolean
  startTime: string
  endTime: string
  slotPrice?: string | null
  canStartRecurring?: boolean | null
  recurringAnchorBookingId?: number | null
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
