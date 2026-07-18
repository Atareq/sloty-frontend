import { apiRequest } from '../../core/api/apiClient'
import type { PaginatedResponse } from '../../shared/api/api.types'
import { apiEndpoints } from '../../shared/api/apiEndpoints'
import type {
  BookingCancelPayload,
  BookingCompletePayload,
  BookingCreatePayload,
  BookingListItem,
  BookingListParams,
  BookingNoShowPayload,
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
 * The backend may return HOLD; payment and release actions happen after
 * creation through focused sheets.
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
 * Cancels a confirmed booking from the Booking Details sheet.
 *
 * Expire remains deferred; payment recording lives in transactions APIs.
 */
export function cancelBooking(
  clubSlug: string,
  bookingId: number | string,
  payload?: BookingCancelPayload,
): Promise<BookingListItem> {
  return apiRequest<BookingListItem>(
    apiEndpoints.clubs.bookings.cancel(clubSlug, bookingId),
    {
      method: 'POST',
      ...(payload ? { body: payload } : {}),
    },
  )
}

export function completeBooking(
  clubSlug: string,
  bookingId: number | string,
  payload?: BookingCompletePayload,
): Promise<BookingListItem> {
  return apiRequest<BookingListItem>(
    apiEndpoints.clubs.bookings.complete(clubSlug, bookingId),
    {
      method: 'POST',
      ...(payload ? { body: payload } : {}),
    },
  )
}

export function markBookingNoShow(
  clubSlug: string,
  bookingId: number | string,
  payload?: BookingNoShowPayload,
): Promise<BookingListItem> {
  return apiRequest<BookingListItem>(
    apiEndpoints.clubs.bookings.noShow(clubSlug, bookingId),
    {
      method: 'POST',
      ...(payload ? { body: payload } : {}),
    },
  )
}
