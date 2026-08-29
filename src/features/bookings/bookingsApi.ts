import { apiRequest } from '../../core/api/apiClient'
import type { PaginatedResponse } from '../../shared/api/api.types'
import { apiEndpoints } from '../../shared/api/apiEndpoints'
import {
  buildPathWithQuery,
  type QueryParamValue,
} from '../../shared/utils/buildPathWithQuery'
import type { Booking, BookingsQueryParams } from './bookings.types'

function buildBookingsListPath(
  clubSlug: string,
  params: BookingsQueryParams = {},
): string {
  const query: Record<string, QueryParamValue> = {
    court: params.court,
    date: params.date,
    date_from: params.date_from,
    date_to: params.date_to,
    ended: params.ended,
    hold_expiring: params.hold_expiring,
    needs_action: params.needs_action,
    overdue: params.overdue,
    ordering: params.ordering,
    page: params.page,
    search: params.search,
    upcoming: params.upcoming,
    has_remaining_amount: params.has_remaining_amount,
    status: params.status,
  }

  return buildPathWithQuery(apiEndpoints.clubs.bookings.list(clubSlug), query)
}

/**
 * Lists existing bookings for the review/filtering page.
 *
 * Schedule keeps its court/day board API wrapper separate because it derives
 * availability slots, while this page accepts broader Summary redirect filters.
 */
export function listBookings(
  clubSlug: string,
  params: BookingsQueryParams = {},
): Promise<PaginatedResponse<Booking>> {
  return apiRequest<PaginatedResponse<Booking>>(
    buildBookingsListPath(clubSlug, params),
  )
}
