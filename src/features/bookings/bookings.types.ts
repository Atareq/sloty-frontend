import type {
  BackendBookingStatus,
  BookingListItem,
} from '../schedule/scheduleApi.types'

export type BookingStatus = BackendBookingStatus

export interface BookingsQueryParams {
  date?: string
  date_from?: string
  date_to?: string
  court?: number | string
  status?: BookingStatus | ''
  needs_action?: boolean | string | ''
  overdue?: boolean | string | ''
  remaining_amount_gt?: number | string
  ended?: boolean | string | ''
  hold_expiring?: boolean | string | ''
  page?: number | string
}

export type Booking = BookingListItem

export const bookingStatusLabels: Record<BookingStatus, string> = {
  HOLD: 'بانتظار العربون',
  CONFIRMED: 'مؤكد',
  COMPLETED: 'مكتمل',
  CANCELLED: 'ملغي',
  NO_SHOW: 'لم يحضر',
  EXPIRED: 'منتهي',
}
