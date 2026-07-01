import { apiRequest } from '../../core/api/apiClient'
import type { PaginatedResponse } from '../../shared/api/api.types'
import { apiEndpoints } from '../../shared/api/apiEndpoints'
import type {
  CourtWorkingHour,
  CourtWorkingHourPayload,
} from './courtWorkingHours.types'

/**
 * Lists all working-hour records for a club.
 *
 * The backend endpoint is club-scoped, so court filtering stays in the feature
 * UI that knows the current court id.
 */
export function listCourtWorkingHours(
  clubSlug: string,
): Promise<PaginatedResponse<CourtWorkingHour>> {
  return apiRequest<PaginatedResponse<CourtWorkingHour>>(
    apiEndpoints.clubs.courtWorkingHours.list(clubSlug),
  )
}

export function createCourtWorkingHour(
  clubSlug: string,
  payload: CourtWorkingHourPayload,
): Promise<CourtWorkingHour> {
  return apiRequest<CourtWorkingHour>(
    apiEndpoints.clubs.courtWorkingHours.list(clubSlug),
    {
      method: 'POST',
      body: payload,
    },
  )
}

export function updateCourtWorkingHour(
  clubSlug: string,
  id: number | string,
  payload: Partial<CourtWorkingHourPayload>,
): Promise<CourtWorkingHour> {
  return apiRequest<CourtWorkingHour>(
    apiEndpoints.clubs.courtWorkingHours.detail(clubSlug, id),
    {
      method: 'PATCH',
      body: payload,
    },
  )
}
