import { apiRequest } from '../../core/api/apiClient'
import type { PaginatedResponse } from '../../shared/api/api.types'
import { apiEndpoints } from '../../shared/api/apiEndpoints'
import { normalizeTimeString } from './components/CourtWorkingHoursSection/courtWorkingHours.helpers'
import type {
  CourtWorkingHoursApiResponse,
  CourtWorkingHoursResponse,
  CourtWorkingDay,
  UpdateCourtWorkingHoursPayload,
} from './courtWorkingHours.types'

function normalizeWorkingDay(record: CourtWorkingDay): CourtWorkingDay {
  return {
    weekday: record.weekday,
    pricing_periods: Array.isArray(record.pricing_periods)
      ? record.pricing_periods.map((period) => ({
        ...(period.id === undefined ? {} : { id: period.id }),
        starts_at: normalizeTimeString(period.starts_at),
        ends_at: normalizeTimeString(period.ends_at),
        price: period.price,
      }))
      : [],
  }
}

export function normalizeCourtWorkingHoursResponse(
  response: CourtWorkingHoursApiResponse,
): CourtWorkingHoursResponse {
  return {
    court: response.court,
    court_name: response.court_name,
    working_hours: Array.isArray(response.working_hours)
      ? response.working_hours.map(normalizeWorkingDay)
      : [],
  }
}

/**
 * Loads the weekly recurring working-hours schedule for one court.
 */
export async function getCourtWorkingHours(
  clubSlug: string,
  courtId: number | string,
): Promise<CourtWorkingHoursResponse> {
  const response = await apiRequest<
    CourtWorkingHoursApiResponse | PaginatedResponse<CourtWorkingHoursApiResponse>
  >(apiEndpoints.clubs.courts.workingHours.detail(clubSlug, courtId))

  const courtData =
    'results' in response && Array.isArray(response.results)
      ? response.results[0]
      : (response as CourtWorkingHoursApiResponse)

  if (!courtData) {
    throw new Error('لم يتم العثور على ساعات العمل لهذا الملعب')
  }

  return normalizeCourtWorkingHoursResponse(courtData)
}

/**
 * Replaces the full weekly recurring working-hours schedule for one court.
 */
export function saveCourtWorkingHours(
  clubSlug: string,
  courtId: number | string,
  payload: UpdateCourtWorkingHoursPayload,
): Promise<CourtWorkingHoursResponse> {
  return apiRequest<CourtWorkingHoursApiResponse>(
    apiEndpoints.clubs.courts.workingHours.detail(clubSlug, courtId),
    {
      method: 'PUT',
      body: payload,
    },
  ).then(normalizeCourtWorkingHoursResponse)
}
