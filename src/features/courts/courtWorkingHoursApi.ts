import { apiRequest } from '../../core/api/apiClient'
import { apiEndpoints } from '../../shared/api/apiEndpoints'
import type {
  CourtWorkingHoursPutPayload,
  CourtWorkingHoursResponse,
} from './courtWorkingHours.types'

/**
 * Loads the weekly recurring working-hours schedule for one court.
 */
export function getCourtWorkingHours(
  clubSlug: string,
  courtId: number | string,
): Promise<CourtWorkingHoursResponse> {
  return apiRequest<CourtWorkingHoursResponse>(
    apiEndpoints.clubs.courts.workingHours.detail(clubSlug, courtId),
  )
}

/**
 * Replaces the full weekly recurring working-hours schedule for one court.
 */
export function saveCourtWorkingHours(
  clubSlug: string,
  courtId: number | string,
  payload: CourtWorkingHoursPutPayload,
): Promise<CourtWorkingHoursResponse> {
  return apiRequest<CourtWorkingHoursResponse>(
    apiEndpoints.clubs.courts.workingHours.detail(clubSlug, courtId),
    {
      method: 'PUT',
      body: payload,
    },
  )
}
