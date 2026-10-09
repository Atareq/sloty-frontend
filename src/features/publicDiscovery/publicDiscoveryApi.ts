import { apiRequest, type ApiRequestOptions } from '../../core/api/apiClient'
import { apiEndpoints } from '../../shared/api/apiEndpoints'
import { mapPublicCourtDiscoveryResponse } from './publicDiscovery.mappers'
import {
  MAX_DISCOVERY_SELECTED_TIMES,
  type DiscoveryCourtPage,
  type PublicCourtDiscoveryParams,
  type PublicCourtDiscoveryResponse,
  type PublicCourtSearchParams,
  type PublicCourtSearchResponse,
} from './publicDiscovery.types'

/** Builds `public/courts/?page=…`. */
export function buildPublicCourtDiscoveryPath({
  page,
}: PublicCourtDiscoveryParams): string {
  const searchParams = new URLSearchParams({
    page: String(page),
  })

  return `${apiEndpoints.public.courts}?${searchParams.toString()}`
}

/**
 * Builds `public/courts/search/?...` for Phase 2/3/4 filtered discovery:
 * - Phase 4 Court filter: includes `court_id=<courtId>` when `courtId` is set.
 * - Phase 2/3 Day + Times filter: includes `date=YYYY-MM-DD` and optional
 *   sorted `times=HH:MM,...` (up to 5 times).
 * - Always includes `page=<page>`.
 */
export function buildPublicCourtSearchPath({
  date,
  times,
  courtId,
  page,
}: PublicCourtSearchParams): string {
  const normalizedDate = typeof date === 'string' ? date.trim() : ''
  const normalizedTimes = Array.from(
    new Set(
      times
        .map((time) => time.trim())
        .filter((time) => time.length > 0),
    ),
  )
    .sort()
    .slice(0, MAX_DISCOVERY_SELECTED_TIMES)

  const queryParts: string[] = []

  if (typeof courtId === 'number' && Number.isInteger(courtId) && courtId > 0) {
    queryParts.push(`court_id=${encodeURIComponent(String(courtId))}`)
  }

  if (normalizedDate.length > 0) {
    queryParts.push(`date=${encodeURIComponent(normalizedDate)}`)
  }

  if (normalizedDate.length > 0 && normalizedTimes.length > 0) {
    queryParts.push(`times=${normalizedTimes.join(',')}`)
  }

  queryParts.push(`page=${encodeURIComponent(String(page))}`)

  return `${apiEndpoints.public.courtsSearch}?${queryParts.join('&')}`
}

/**
 * Lists real, publicly discoverable Courts for one page.
 *
 * `GET /api/v1/public/courts/?page=1` is anonymous: it
 * never sends a Bearer token and never triggers token refresh. The response
 * is mapped at this boundary, so callers only see `DiscoveryCourtPage`.
 */
export async function listPublicCourts(
  params: PublicCourtDiscoveryParams,
  options: Pick<ApiRequestOptions, 'signal'> = {},
): Promise<DiscoveryCourtPage> {
  const response = await apiRequest<PublicCourtDiscoveryResponse>(
    buildPublicCourtDiscoveryPath(params),
    {
      method: 'GET',
      signal: options.signal,
      skipAuthRefresh: true,
      omitAuth: true,
    },
  )

  return mapPublicCourtDiscoveryResponse(response)
}

/**
 * Searches publicly discoverable Courts matching the selected Court (Phase 4)
 * and/or selected day and optional times (Phase 2/3, up to 5 times, OR matching).
 *
 * `GET /api/v1/public/courts/search/?...` is anonymous (`omitAuth: true`,
 * `skipAuthRefresh: true`) and maps Backend results to `DiscoveryCourtPage`.
 */
export async function searchPublicCourts(
  params: PublicCourtSearchParams,
  options: Pick<ApiRequestOptions, 'signal'> = {},
): Promise<DiscoveryCourtPage> {
  const response = await apiRequest<PublicCourtSearchResponse>(
    buildPublicCourtSearchPath(params),
    {
      method: 'GET',
      signal: options.signal,
      skipAuthRefresh: true,
      omitAuth: true,
    },
  )

  return mapPublicCourtDiscoveryResponse(response)
}
