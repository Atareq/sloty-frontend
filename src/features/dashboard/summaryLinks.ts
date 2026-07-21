import { buildPathWithQuery } from '../../shared/utils/buildPathWithQuery'
import type { QueryParamValue } from '../../shared/utils/buildPathWithQuery'
import type { DashboardSummaryResponse } from './dashboard.types'

export function getContextDateQuery(
  context: DashboardSummaryResponse['context'],
): Record<string, QueryParamValue> {
  return {
    date: context.date_from === context.date_to ? context.date_from : undefined,
    date_from:
      context.date_from !== context.date_to ? context.date_from : undefined,
    date_to: context.date_from !== context.date_to ? context.date_to : undefined,
  }
}

export function buildSummaryLink(
  path: string,
  context: DashboardSummaryResponse['context'],
  query: Record<string, QueryParamValue> = {},
): string {
  return buildPathWithQuery(path, {
    ...getContextDateQuery(context),
    ...query,
  })
}
