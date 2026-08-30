import { apiRequest } from '../../core/api/apiClient'
import type { PaginatedResponse } from '../../shared/api/api.types'
import { apiEndpoints } from '../../shared/api/apiEndpoints'
import type { Court, CourtPayload } from './courts.types'

/**
 * API wrapper for courts nested under a club slug.
 *
 * The backend owns permissions and validation; these helpers only centralize
 * the typed frontend calls used by Sprint 2A setup screens.
 */
export function listCourts(
  clubSlug: string,
  options: { signal?: AbortSignal } = {},
): Promise<PaginatedResponse<Court>> {
  const path = apiEndpoints.clubs.courts.list(clubSlug)

  if (!options.signal) {
    return apiRequest<PaginatedResponse<Court>>(path)
  }

  return apiRequest<PaginatedResponse<Court>>(
    path,
    { signal: options.signal },
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
