import { apiRequest, type ApiRequestOptions } from '../../core/api/apiClient'
import { apiEndpoints } from '../../shared/api/apiEndpoints'
import type {
  PublicCourtAvailabilityResponse,
  PublicScheduleParams,
} from './publicSchedule.types'

/**
 * Builds the request path for the public court availability endpoint.
 */
export function buildPublicCourtAvailabilityPath(
  clubSlug: string,
  courtId: number | string,
  params?: PublicScheduleParams,
): string {
  const basePath = apiEndpoints.public.courtAvailability(clubSlug, courtId)

  if (!params?.date) {
    return basePath
  }

  const searchParams = new URLSearchParams()
  searchParams.set('date', params.date)

  return `${basePath}?${searchParams.toString()}`
}

/**
 * Fetches sanitized public availability for a court and date.
 *
 * This endpoint is public, guest-accessible, and requires no authentication.
 * It contains no customer names, phones, notes, booking IDs, or money amounts.
 */
export async function getPublicCourtAvailability(
  clubSlug: string,
  courtId: number | string,
  params?: PublicScheduleParams,
  options: Pick<ApiRequestOptions, 'signal'> = {},
): Promise<PublicCourtAvailabilityResponse> {
  return apiRequest<PublicCourtAvailabilityResponse>(
    buildPublicCourtAvailabilityPath(clubSlug, courtId, params),
    {
      method: 'GET',
      signal: options.signal,
      skipAuthRefresh: true,
      omitAuth: true,
    },
  )
}
