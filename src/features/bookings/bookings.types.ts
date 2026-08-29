import type {
  BackendBookingStatus,
  BookingListItem,
} from '../schedule/scheduleApi.types'
import { bookingStatusLabels as canonicalBookingStatusLabels } from './bookingDisplay.helpers'

export type BookingStatus = BackendBookingStatus

export interface BookingsQueryParams {
  date?: string
  date_from?: string
  date_to?: string
  court?: number | string
  status?: BookingStatus | ''
  needs_action?: boolean | string | ''
  overdue?: boolean | string | ''
  search?: string
  upcoming?: boolean | string | ''
  has_remaining_amount?: boolean | string | ''
  ended?: boolean | string | ''
  hold_expiring?: boolean | string | ''
  page?: number | string
}

export type Booking = BookingListItem

/** Canonical Booking status labels live in `bookingDisplay.helpers`. */
export const bookingStatusLabels = canonicalBookingStatusLabels
