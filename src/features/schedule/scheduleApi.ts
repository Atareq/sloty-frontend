import { apiRequest } from '../../core/api/apiClient'
import type { PaginatedResponse } from '../../shared/api/api.types'
import { apiEndpoints } from '../../shared/api/apiEndpoints'
import type {
  BookingCancelPayload,
  BookingCancellationPreview,
  BookingCreatePayload,
  BookingListItem,
  BookingListParams,
  BookingSlotsParams,
  BookingSlotsRangeParams,
  BookingSlotsResponse,
  BookingNoShowPayload,
} from './scheduleApi.types'

function isBookingSlotsRangeParams(
  params: BookingSlotsParams,
): params is BookingSlotsRangeParams {
  return 'date_from' in params
}

export function buildBookingListPath(
  clubSlug: string,
  params: BookingListParams,
): string {
  const searchParams = new URLSearchParams()

  searchParams.set('court', String(params.court))
  searchParams.set('date', params.date)

  return `${apiEndpoints.clubs.bookings.list(clubSlug)}?${searchParams.toString()}`
}

export function buildBookingSlotsPath(
  clubSlug: string,
  params: BookingSlotsParams,
): string {
  const searchParams = new URLSearchParams()

  searchParams.set('court', String(params.court))

  if (isBookingSlotsRangeParams(params)) {
    searchParams.set('date_from', params.date_from)
    searchParams.set('date_to', params.date_to)
  } else {
    searchParams.set('date', params.date)
  }

  return `${apiEndpoints.clubs.bookings.slots(clubSlug)}?${searchParams.toString()}`
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
 * Lists backend-calculated availability slots for the active Schedule board.
 *
 * Schedule uses `slot.is_available` for clickability and `slot.label` for
 * localized slot display text while keeping booking lifecycle status separate.
 */
export function listBookingSlots(
  clubSlug: string,
  params: BookingSlotsParams,
): Promise<BookingSlotsResponse> {
  return apiRequest<BookingSlotsResponse>(buildBookingSlotsPath(clubSlug, params))
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

/**
 * Loads the backend-calculated cancellation refund preview.
 *
 * The preview is informational only; the cancel endpoint recalculates policy
 * and money at mutation time.
 */
export function previewBookingCancellation(
  clubSlug: string,
  bookingId: number | string,
): Promise<BookingCancellationPreview> {
  return apiRequest<BookingCancellationPreview>(
    apiEndpoints.clubs.bookings.cancellationPreview(clubSlug, bookingId),
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
