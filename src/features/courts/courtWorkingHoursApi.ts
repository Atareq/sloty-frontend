import { apiRequest } from '../../core/api/apiClient'
import { apiEndpoints } from '../../shared/api/apiEndpoints'
import type {
  CourtWorkingHour,
  CourtWorkingHourApiRecord,
  CourtWorkingHoursApiResponse,
  CourtWorkingHoursPutPayload,
  CourtWorkingHoursResponse,
} from './courtWorkingHours.types'

function normalizeTime(value: string | null | undefined): string {
  return typeof value === 'string'
    ? value.split(':').slice(0, 2).join(':')
    : ''
}

function normalizeWorkingHour(record: CourtWorkingHourApiRecord): CourtWorkingHour {
  const blocks = Array.isArray(record.blocks)
    ? record.blocks.map((block) => ({
        ...(block.id === undefined ? {} : { id: block.id }),
        start_time: normalizeTime(block.start_time),
        end_time: normalizeTime(block.end_time),
      }))
    : record.opens_at && record.closes_at
      ? [
          {
            start_time: normalizeTime(record.opens_at),
            end_time: normalizeTime(record.closes_at),
          },
        ]
      : []

  return {
    ...(record.id === undefined ? {} : { id: record.id }),
    weekday: record.weekday,
    is_closed: Boolean(record.is_closed),
    blocks: record.is_closed ? [] : blocks,
  }
}

export function normalizeCourtWorkingHoursResponse(
  response: CourtWorkingHoursApiResponse,
): CourtWorkingHoursResponse {
  return {
    court: response.court,
    court_name: response.court_name,
    working_hours: Array.isArray(response.working_hours)
      ? response.working_hours.map(normalizeWorkingHour)
      : [],
  }
}

/**
 * Loads the weekly recurring working-hours schedule for one court.
 */
export function getCourtWorkingHours(
  clubSlug: string,
  courtId: number | string,
): Promise<CourtWorkingHoursResponse> {
  return apiRequest<CourtWorkingHoursApiResponse>(
    apiEndpoints.clubs.courts.workingHours.detail(clubSlug, courtId),
  ).then(normalizeCourtWorkingHoursResponse)
}

/**
 * Replaces the full weekly recurring working-hours schedule for one court.
 */
export function saveCourtWorkingHours(
  clubSlug: string,
  courtId: number | string,
  payload: CourtWorkingHoursPutPayload,
): Promise<CourtWorkingHoursResponse> {
  return apiRequest<CourtWorkingHoursApiResponse>(
    apiEndpoints.clubs.courts.workingHours.detail(clubSlug, courtId),
    {
      method: 'PUT',
      body: payload,
    },
  ).then(normalizeCourtWorkingHoursResponse)
}
