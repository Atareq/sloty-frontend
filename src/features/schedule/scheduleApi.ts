import { apiRequest } from '../../core/api/apiClient'
import type { PaginatedResponse } from '../../shared/api/api.types'
import { apiEndpoints } from '../../shared/api/apiEndpoints'
import { getPreviousCalendarDate } from '../../shared/utils/date'
import type {
  BookingCancelPayload,
  BookingCancellationPreview,
  BookingCompletePayload,
  BookingCreatePayload,
  BookingEndRecurrencePayload,
  BookingListItem,
  BookingListParams,
  BookingRecurrenceNextPreview,
  BookingReschedulePayload,
  BookingSlotsParams,
  BookingSlotsRangeParams,
  BookingSlotsResponse,
  BookingNoShowPayload,
  BookingUpdatePayload,
  BookingUpdateResponse,
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
    searchParams.set('date_from', getPreviousCalendarDate(params.date_from))
    searchParams.set('date_to', params.date_to)
  } else {
    searchParams.set('date_from', getPreviousCalendarDate(params.date))
    searchParams.set('date_to', params.date)
  }

  return `${apiEndpoints.clubs.bookings.slots(clubSlug)}?${searchParams.toString()}`
}

/**
 * Lists booking records for one court and date.
 *
 * Schedule Board uses `listBookingSlots`. This wrapper remains the typed client
 * for the court+date bookings list contract.
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
 * Schedule uses `slot.is_available` only for FREE-slot bookability.
 * Occupied and recurring-reserved slots stay interactive according to their
 * backend status; frontend date comparisons do not block slot interaction.
 */
export function listBookingSlots(
  clubSlug: string,
  params: BookingSlotsParams,
  options: { signal?: AbortSignal } = {},
): Promise<BookingSlotsResponse> {
  const path = buildBookingSlotsPath(clubSlug, params)

  if (!options.signal) {
    return apiRequest<BookingSlotsResponse>(path)
  }

  return apiRequest<BookingSlotsResponse>(
    path,
    { signal: options.signal },
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
  options: { signal?: AbortSignal } = {},
): Promise<BookingListItem> {
  return apiRequest<BookingListItem>(apiEndpoints.clubs.bookings.list(clubSlug), {
    method: 'POST',
    body: payload,
    ...(options.signal ? { signal: options.signal } : {}),
  })
}

/** Loads the canonical booking record used by all booking-context actions. */
export function getBooking(
  clubSlug: string,
  bookingId: number | string,
): Promise<BookingListItem> {
  return apiRequest<BookingListItem>(
    apiEndpoints.clubs.bookings.detail(clubSlug, bookingId),
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

/** Stops the active weekly recurrence while keeping the booking record. */
export function endBookingRecurrence(
  clubSlug: string,
  bookingId: number | string,
  payload?: BookingEndRecurrencePayload,
): Promise<BookingListItem> {
  return apiRequest<BookingListItem>(
    apiEndpoints.clubs.bookings.endRecurrence(clubSlug, bookingId),
    {
      method: 'POST',
      ...(payload ? { body: payload } : {}),
    },
  )
}

/**
 * Loads the backend-owned weekly continuation preview.
 *
 * Call this only for CONFIRMED bookings with active recurrence. Do not read a
 * nested `recurrence_next` object from Booking list/detail payloads.
 */
export function getBookingRecurrenceNext(
  clubSlug: string,
  bookingId: number | string,
): Promise<BookingRecurrenceNextPreview> {
  return apiRequest<BookingRecurrenceNextPreview>(
    apiEndpoints.clubs.bookings.recurrenceNext(clubSlug, bookingId),
  )
}

/**
 * Updates booking customer intent and notes.
 *
 * Backend owns PlayerProfile → ClubPlayer resolution. This client never
 * sends `club_player_id` or `player_profile_id`. Callers still refetch
 * canonical Booking detail after success.
 */
export function updateBooking(
  clubSlug: string,
  bookingId: number | string,
  payload: BookingUpdatePayload,
): Promise<BookingUpdateResponse> {
  return apiRequest<BookingUpdateResponse>(
    apiEndpoints.clubs.bookings.detail(clubSlug, bookingId),
    {
      method: 'PATCH',
      body: {
        customer_name: payload.customer_name,
        customer_phone: payload.customer_phone,
        notes: payload.notes,
      },
    },
  )
}

/** @deprecated Use updateBooking. */
export const updateBookingNotes = updateBooking
/** @deprecated Use updateBooking. */
export const updateBookingCustomer = updateBooking

/**
 * Moves a non-active-recurring HOLD/CONFIRMED booking to a backend-available slot.
 *
 * Active weekly recurrence must stay hidden; the backend rejects that case.
 */
export function rescheduleBooking(
  clubSlug: string,
  bookingId: number | string,
  payload: BookingReschedulePayload,
): Promise<BookingListItem> {
  return apiRequest<BookingListItem>(
    apiEndpoints.clubs.bookings.reschedule(clubSlug, bookingId),
    {
      method: 'POST',
      body: payload,
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
