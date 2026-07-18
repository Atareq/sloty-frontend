import type { BookingListItem } from './scheduleApi.types'

export type BookingBoardSlotStatus =
  | 'available'
  | 'hold'
  | 'confirmed'
  | 'cancelled'
export type BookingBoardPeriod = 'day' | 'night'

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
 * time range. HOLD is visible because it blocks availability, while payment
 * and lifecycle details stay inside focused sheets.
 */
export interface ScheduleBooking {
  id: string
  status: BookingBoardSlotStatus
  startTime: string
  endTime: string
  period: BookingBoardPeriod
  booking?: BookingListItem
}

export interface ScheduleSummary {
  availableCount: number
  confirmedCount: number
  cancelledCount: number
  totalSlots: number
}
