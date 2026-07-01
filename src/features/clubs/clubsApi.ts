import { apiRequest } from '../../core/api/apiClient'
import type { PaginatedResponse } from '../../shared/api/api.types'
import { apiEndpoints } from '../../shared/api/apiEndpoints'
import type { Club, ClubPayload } from './clubs.types'

/**
 * Lists clubs for the platform setup screens.
 *
 * Endpoint paths stay in the shared registry; this feature module owns only
 * the small frontend-facing type contract.
 */
export function listClubs(): Promise<PaginatedResponse<Club>> {
  return apiRequest<PaginatedResponse<Club>>(apiEndpoints.clubs.list)
}

export function createClub(payload: ClubPayload): Promise<Club> {
  return apiRequest<Club>(apiEndpoints.clubs.list, {
    method: 'POST',
    body: payload,
  })
}

export function getClub(clubId: number | string): Promise<Club> {
  return apiRequest<Club>(apiEndpoints.clubs.detail(clubId))
}

export function updateClub(
  clubId: number | string,
  payload: ClubPayload,
): Promise<Club> {
  return apiRequest<Club>(apiEndpoints.clubs.detail(clubId), {
    method: 'PATCH',
    body: payload,
  })
}
