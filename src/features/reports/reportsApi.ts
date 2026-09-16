import { apiRequest } from '../../core/api/apiClient'
import type { PaginatedResponse } from '../../shared/api/api.types'
import { apiEndpoints } from '../../shared/api/apiEndpoints'
import {
  buildPathWithQuery,
  type QueryParamValue,
} from '../../shared/utils/buildPathWithQuery'
import type {
  CourtUsageReport,
  CourtUsageReportQueryParams,
} from './reports.types'

/**
 * Loads the active backend court-usage analytics contract for ReportsPage.
 */
export async function getCourtUsageReport(
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

  const response = await apiRequest<
    CourtUsageReport | PaginatedResponse<CourtUsageReport>
  >(
    buildPathWithQuery(apiEndpoints.clubs.reports.courtUsage(clubSlug), query),
  )

  const report =
    'results' in response && Array.isArray(response.results)
      ? response.results[0]
      : (response as CourtUsageReport)

  if (!report) {
    throw new Error('لم يتم العثور على بيانات التقرير للفترة المحددة')
  }

  return report
}
