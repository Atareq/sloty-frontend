import { apiRequest } from '../../core/api/apiClient'
import { apiEndpoints } from '../../shared/api/apiEndpoints'
import {
  buildPathWithQuery,
  type QueryParamValue,
} from '../../shared/utils/buildPathWithQuery'
import type {
  DashboardSummaryQuery,
  DashboardSummaryResponse,
} from './dashboard.types'

function buildDashboardSummaryPath(
  clubSlug: string,
  params: DashboardSummaryQuery = {},
): string {
  const query: Record<string, QueryParamValue> = {
    collected_by: params.collected_by,
    court: params.court,
    date: params.date,
    date_from: params.date_from,
    date_to: params.date_to,
    payment_method: params.payment_method,
    settlement_status: params.settlement_status,
  }

  return buildPathWithQuery(apiEndpoints.clubs.dashboard.summary(clubSlug), query)
}

/**
 * Loads backend-calculated Summary / Owner Home metrics for the selected club.
 */
export function getDashboardSummary(
  clubSlug: string,
  params: DashboardSummaryQuery = {},
): Promise<DashboardSummaryResponse> {
  return apiRequest<DashboardSummaryResponse>(
    buildDashboardSummaryPath(clubSlug, params),
  )
}
