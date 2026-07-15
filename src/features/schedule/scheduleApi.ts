import { apiRequest } from '../../core/api/apiClient'
import type { PaginatedResponse } from '../../shared/api/api.types'
import { apiEndpoints } from '../../shared/api/apiEndpoints'
import type {
  BookingCreatePayload,
  BookingListItem,
  BookingListParams,
  BookingReschedulePayload,
} from './scheduleApi.types'

export function buildBookingListPath(
  clubSlug: string,
  params: BookingListParams,
): string {
  const searchParams = new URLSearchParams()

  searchParams.set('court', String(params.court))
  searchParams.set('date', params.date)

  return `${apiEndpoints.clubs.bookings.list(clubSlug)}?${searchParams.toString()}`
}

/**
 * Lists booking records for one court/day so the Booking Board can derive
 * availability without exposing lifecycle or payment details.
 */
export function listBookingsForCourtDay(
  clubSlug: string,
  params: BookingListParams,
): Promise<PaginatedResponse<BookingListItem>> {
  return apiRequest<PaginatedResponse<BookingListItem>>(
    buildBookingListPath(clubSlug, params),
  )
}

/**
 * Creates one manual booking from an available or cancelled Booking Board slot.
 *
 * Payments and lifecycle actions intentionally stay out of Sprint 3B.
 */
export function createBooking(
  clubSlug: string,
  payload: BookingCreatePayload,
): Promise<BookingListItem> {
  return apiRequest<BookingListItem>(apiEndpoints.clubs.bookings.list(clubSlug), {
    method: 'POST',
    body: payload,
  })
}

/**
 * Updates a booking's court/time using the existing detail PATCH endpoint.
 *
 * Backend validation remains authoritative for overlap and permissions.
 */
export function rescheduleBooking(
  clubSlug: string,
  bookingId: number | string,
  payload: BookingReschedulePayload,
): Promise<BookingListItem> {
  return apiRequest<BookingListItem>(
    apiEndpoints.clubs.bookings.detail(clubSlug, bookingId),
    {
      method: 'PATCH',
      body: payload,
    },
  )
}

/**
 * Cancels a confirmed booking from the Booking Details sheet.
 *
 * Expire remains deferred; payment recording lives in transactions APIs.
 */
export function cancelBooking(
  clubSlug: string,
  bookingId: number | string,
): Promise<BookingListItem> {
  return apiRequest<BookingListItem>(
    apiEndpoints.clubs.bookings.cancel(clubSlug, bookingId),
    {
      method: 'POST',
    },
  )
}

export function completeBooking(
  clubSlug: string,
  bookingId: number | string,
): Promise<BookingListItem> {
  return apiRequest<BookingListItem>(
    apiEndpoints.clubs.bookings.complete(clubSlug, bookingId),
    {
      method: 'POST',
    },
  )
}

export function markBookingNoShow(
  clubSlug: string,
  bookingId: number | string,
): Promise<BookingListItem> {
  return apiRequest<BookingListItem>(
    apiEndpoints.clubs.bookings.noShow(clubSlug, bookingId),
    {
      method: 'POST',
    },
  )
}
