import { apiRequest } from '../../core/api/apiClient'
import type { PaginatedResponse } from '../../shared/api/pagination.types'
import { fetchAllPages } from '../../shared/api/pagination.helpers'
import { apiEndpoints } from '../../shared/api/apiEndpoints'
import { buildPathWithQuery } from '../../shared/utils/buildPathWithQuery'
import type { Court, CourtPayload } from './courts.types'

export interface ListCourtsParams {
  search?: string
  page?: number
  is_active?: boolean
}

export interface ListCourtsOptions {
  signal?: AbortSignal
  nextUrl?: string
  params?: ListCourtsParams
}

/**
 * API wrapper for courts nested under a club slug.
 *
 * Supports DRF pagination:
 * - Pass `nextUrl` to follow a previous paginated response page link.
 * - Pass `params.search` to filter courts by name on the backend.
 * - Pass `params.is_active` to filter active/inactive courts.
 */
export function listCourts(
  clubSlug: string,
  options: ListCourtsOptions | { signal?: AbortSignal; nextUrl?: string } = {},
): Promise<PaginatedResponse<Court>> {
  let path = apiEndpoints.clubs.courts.list(clubSlug)

  if (options.nextUrl) {
    path = options.nextUrl
  } else if ('params' in options && options.params) {
    path = buildPathWithQuery(apiEndpoints.clubs.courts.list(clubSlug), {
      search: options.params.search?.trim(),
      page: options.params.page,
      is_active: options.params.is_active,
    })
  }

  if (!options.signal) {
    return apiRequest<PaginatedResponse<Court>>(path)
  }

  return apiRequest<PaginatedResponse<Court>>(path, {
    signal: options.signal,
  })
}

/**
 * Fetches all courts for a club by sequentially following `next` pagination links until null.
 */
export function fetchAllCourts(
  clubSlug: string,
  options: { signal?: AbortSignal } = {},
): Promise<Court[]> {
  return fetchAllPages((nextUrl) =>
    listCourts(clubSlug, { nextUrl, signal: options.signal }),
  )
}


export function createCourt(
  clubSlug: string,
  payload: CourtPayload,
): Promise<Court> {
  return apiRequest<Court>(apiEndpoints.clubs.courts.list(clubSlug), {
    method: 'POST',
    body: payload,
  })
}

export function getCourt(
  clubSlug: string,
  courtId: number | string,
): Promise<Court> {
  return apiRequest<Court>(apiEndpoints.clubs.courts.detail(clubSlug, courtId))
}

export function updateCourt(
  clubSlug: string,
  courtId: number | string,
  payload: CourtPayload,
): Promise<Court> {
  return apiRequest<Court>(
    apiEndpoints.clubs.courts.detail(clubSlug, courtId),
    {
      method: 'PATCH',
      body: payload,
    },
  )
}
