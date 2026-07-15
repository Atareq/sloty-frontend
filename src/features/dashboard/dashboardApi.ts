import { apiRequest } from '../../core/api/apiClient'
import { apiEndpoints } from '../../shared/api/apiEndpoints'
import type { DashboardQueryParams, DashboardSummary } from './dashboard.types'

function buildQueryString(params?: DashboardQueryParams): string {
  const searchParams = new URLSearchParams()

  if (params?.date_from) {
    searchParams.set('date_from', params.date_from)
  }

  if (params?.date_to) {
    searchParams.set('date_to', params.date_to)
  }

  const queryString = searchParams.toString()

  return queryString ? `?${queryString}` : ''
}

/**
 * Loads backend-calculated dashboard metrics for the selected club.
 */
export function getDashboardSummary(
  clubSlug: string,
  params?: DashboardQueryParams,
): Promise<DashboardSummary> {
  return apiRequest<DashboardSummary>(
    `${apiEndpoints.clubs.dashboard.summary(clubSlug)}${buildQueryString(params)}`,
  )
}
