import type {
  Booking,
  BookingsQueryParams,
} from '../../features/bookings/bookings.types'
import {
  isBookingDateRangeInsideSyncWindow,
} from './bookingSyncWindow'

export const unsupportedOfflineBookingFilterKeys = [
  'needs_action',
  'overdue',
  'ended',
  'hold_expiring',
  'upcoming',
] as const

type UnsupportedOfflineBookingFilterKey =
  (typeof unsupportedOfflineBookingFilterKeys)[number]

export type OfflineBookingsViewState =
  | 'ready'
  | 'outside_window'
  | 'unsupported_filter'

export interface OfflineBookingsView {
  state: OfflineBookingsViewState
  bookings: Booking[]
  unsupportedFilters: UnsupportedOfflineBookingFilterKey[]
}

function isTrue(value: BookingsQueryParams[keyof BookingsQueryParams]): boolean {
  return value === true || value === 'true'
}

function normalizeSearchValue(value: string): string {
  return value.trim().toLocaleLowerCase('ar-EG')
}

function normalizePhoneValue(value: string): string {
  return value.replace(/[^\d+]/g, '')
}

function getBookingDate(booking: Booking): string {
  return booking.start_time.slice(0, 10)
}

function isWithinDateFilters(
  booking: Booking,
  params: BookingsQueryParams,
): boolean {
  const bookingDate = getBookingDate(booking)

  if (params.date && bookingDate !== params.date) {
    return false
  }

  if (params.date_from && bookingDate < params.date_from) {
    return false
  }

  if (params.date_to && bookingDate > params.date_to) {
    return false
  }

  return true
}

function isMatchingSearch(booking: Booking, rawSearch?: string): boolean {
  const search = normalizeSearchValue(rawSearch ?? '')

  if (!search) {
    return true
  }

  const phoneSearch = normalizePhoneValue(search)
  const customerName = normalizeSearchValue(booking.customer_name ?? '')
  const customerPhone = normalizePhoneValue(booking.customer_phone ?? '')

  return (
    customerName.includes(search) ||
    (Boolean(phoneSearch) && customerPhone.includes(phoneSearch))
  )
}

function getUnsupportedFilters(
  params: BookingsQueryParams,
): UnsupportedOfflineBookingFilterKey[] {
  return unsupportedOfflineBookingFilterKeys.filter((key) => isTrue(params[key]))
}

/**
 * Applies only safe presentation filters over the complete bounded local cache.
 *
 * Backend-derived operational classifications stay disabled offline unless the
 * canonical API response exposes an authoritative field for them later.
 */
export function getOfflineBookingsView(
  bookings: Booking[],
  params: BookingsQueryParams,
  now = new Date(),
): OfflineBookingsView {
  if (!isBookingDateRangeInsideSyncWindow(params, now)) {
    return {
      state: 'outside_window',
      bookings: [],
      unsupportedFilters: [],
    }
  }

  const unsupportedFilters = getUnsupportedFilters(params)

  if (unsupportedFilters.length > 0) {
    return {
      state: 'unsupported_filter',
      bookings: [],
      unsupportedFilters,
    }
  }

  const filteredBookings = bookings
    .filter((booking) => {
      if (params.court && String(booking.court) !== String(params.court)) {
        return false
      }

      if (params.status && booking.status !== params.status) {
        return false
      }

      if (isTrue(params.has_remaining_amount)) {
        const remainingAmount = Number(booking.remaining_amount ?? 0)

        if (!(remainingAmount > 0)) {
          return false
        }
      }

      return (
        isWithinDateFilters(booking, params) &&
        isMatchingSearch(booking, params.search)
      )
    })
    .sort((first, second) =>
      second.start_time.localeCompare(first.start_time),
    )

  return {
    state: 'ready',
    bookings: filteredBookings,
    unsupportedFilters: [],
  }
}
