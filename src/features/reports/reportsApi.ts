import { apiRequest } from '../../core/api/apiClient'
import { apiEndpoints } from '../../shared/api/apiEndpoints'
import {
  buildPathWithQuery,
  type QueryParamValue,
} from '../../shared/utils/buildPathWithQuery'
import type {
  CourtUsageReport,
  CourtUsageReportQueryParams,
  ReportsQueryParams,
  ReportsResponse,
} from './reports.types'

function buildQueryString(params?: ReportsQueryParams): string {
  const searchParams = new URLSearchParams()

  if (params?.date_from) {
    searchParams.set('date_from', params.date_from)
  }

  if (params?.date_to) {
    searchParams.set('date_to', params.date_to)
  }

  if (params?.court) {
    searchParams.set('court', String(params.court))
  }

  if (params?.staff) {
    searchParams.set('staff', String(params.staff))
  }

  if (params?.status) {
    searchParams.set('status', params.status)
  }

  if (params?.payment_method) {
    searchParams.set('payment_method', params.payment_method)
  }

  const queryString = searchParams.toString()

  return queryString ? `?${queryString}` : ''
}

/**
 * Loads backend-calculated reports for the selected club and filters.
 */
export function getReports(
  clubSlug: string,
  params?: ReportsQueryParams,
): Promise<ReportsResponse> {
  return apiRequest<ReportsResponse>(
    `${apiEndpoints.clubs.reports.list(clubSlug)}${buildQueryString(params)}`,
  )
}

/**
 * Loads the backend court-usage analytics contract without migrating Reports UI.
 */
export function getCourtUsageReport(
  clubSlug: string,
  params: CourtUsageReportQueryParams,
): Promise<CourtUsageReport> {
  const query: Record<string, QueryParamValue> = {
    date_from: params.date_from,
    date_to: params.date_to,
    court: params.court,
    hour_from: params.hour_from,
    hour_to: params.hour_to,
    period: params.period,
    staff: params.staff,
    status: params.status,
  }

  return apiRequest<CourtUsageReport>(
    buildPathWithQuery(apiEndpoints.clubs.reports.courtUsage(clubSlug), query),
  )
}
