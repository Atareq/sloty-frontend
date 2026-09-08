import { apiRequest } from '../../core/api/apiClient'
import { apiEndpoints } from '../../shared/api/apiEndpoints'
import {
  buildPathWithQuery,
  type QueryParamValue,
} from '../../shared/utils/buildPathWithQuery'
import type {
  BookingAttempt,
  BookingAttemptListResponse,
  BookingAttemptQueryParams,
} from './bookingAttempts.types'

function buildBookingAttemptListPath(
  clubSlug: string,
  params: BookingAttemptQueryParams = {},
): string {
  const query: Record<string, QueryParamValue> = {
    attempted_by: params.attempted_by,
    court: params.court,
    date: params.date,
    date_from: params.date_from,
    date_to: params.date_to,
    failure_code: params.failure_code,
    outcome: params.outcome,
    page: params.page,
    resolution: params.resolution,
    status: params.status,
  }

  return buildPathWithQuery(apiEndpoints.clubs.bookingAttempts.list(clubSlug), query)
}

/** Lists backend-persisted Booking attempts without treating rejected rows as Bookings. */
export function listBookingAttempts(
  clubSlug: string,
  params: BookingAttemptQueryParams = {},
  options: { signal?: AbortSignal } = {},
): Promise<BookingAttemptListResponse> {
  const path = buildBookingAttemptListPath(clubSlug, params)

  if (!options.signal) {
    return apiRequest<BookingAttemptListResponse>(path)
  }

  return apiRequest<BookingAttemptListResponse>(path, {
    signal: options.signal,
  })
}

/** Reads one backend-persisted Booking attempt by id. */
export function getBookingAttempt(
  clubSlug: string,
  id: number | string,
): Promise<BookingAttempt> {
  return apiRequest<BookingAttempt>(
    apiEndpoints.clubs.bookingAttempts.detail(clubSlug, id),
  )
}

/** Dismisses one rejected Booking attempt on the backend. */
export function dismissBookingAttempt(
  clubSlug: string,
  id: number | string,
): Promise<BookingAttempt> {
  return apiRequest<BookingAttempt>(
    apiEndpoints.clubs.bookingAttempts.dismiss(clubSlug, id),
    { method: 'POST', body: {} },
  )
}
