import type { SlotyStatus } from '../../shared/components/StatusChip/StatusChip'

export type ScheduleBookingStatus = SlotyStatus | 'available'

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
 * These fields are intentionally local to the schedule feature. They are not a
 * backend booking model and should be replaced only after API contracts exist.
 */
export interface ScheduleBooking {
  id: string
  status: ScheduleBookingStatus
  timeStart: string
  timeEnd: string
  totalAmount: number
  paidAmount: number
  customerName?: string
  customerPhone?: string
  expiresIn?: string
}

export interface ScheduleSummary {
  bookingCount: number
  holdCount: number
  collectedAmount: number
  remainingAmount: number
}
