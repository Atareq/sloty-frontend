export type BookingBoardSlotStatus = 'available' | 'confirmed' | 'cancelled'
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
 * time range. Operational lifecycle/payment details belong in future details
 * flows, not in this board model.
 */
export interface ScheduleBooking {
  id: string
  status: BookingBoardSlotStatus
  startTime: string
  endTime: string
  period: BookingBoardPeriod
}

export interface ScheduleSummary {
  availableCount: number
  confirmedCount: number
  cancelledCount: number
  totalSlots: number
}
