import type {
  BackendBookingStatus,
  BookingListItem,
} from '../schedule/scheduleApi.types'
import { bookingStatusLabels as canonicalBookingStatusLabels } from './bookingDisplay.helpers'

export type BookingStatus = BackendBookingStatus

/** Backend list ordering for appointment `start_time`. Newest first is default. */
export type BookingOrdering = 'start_time' | '-start_time'

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
  ordering?: BookingOrdering | ''
}

export type Booking = BookingListItem

/** Canonical Booking status labels live in `bookingDisplay.helpers`. */
export const bookingStatusLabels = canonicalBookingStatusLabels
