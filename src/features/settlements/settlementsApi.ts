import { apiRequest } from '../../core/api/apiClient'
import type { PaginatedResponse } from '../../shared/api/api.types'
import { apiEndpoints } from '../../shared/api/apiEndpoints'
import {
  buildPathWithQuery,
  type QueryParamValue,
} from '../../shared/utils/buildPathWithQuery'
import type {
  CreateSettlementPayload,
  CurrentCustodySummaryQueryParams,
  CurrentCustodySummaryResponse,
  Settlement,
  SettlementPreview,
  SettlementPreviewQueryParams,
  SettlementQueryParams,
} from './settlements.types'

function buildQueryString(params?: SettlementQueryParams): string {
  const searchParams = new URLSearchParams()

  if (params?.collected_by) {
    searchParams.set('collected_by', String(params.collected_by))
  }

  if (params?.status) {
    searchParams.set('status', params.status)
  }

  if (params?.court) {
    searchParams.set('court', String(params.court))
  }

  if (params?.page) {
    searchParams.set('page', String(params.page))
  }

  const queryString = searchParams.toString()

  return queryString ? `?${queryString}` : ''
}

function buildCurrentCustodySummaryPath(
  clubSlug: string,
  params: CurrentCustodySummaryQueryParams = {},
): string {
  return buildPathWithQuery(
    apiEndpoints.clubs.settlements.unsettledSummary(clubSlug),
    {
      collected_by: params.collected_by,
    },
  )
}

/**
 * Loads the Backend-authoritative current custody grouped by collector.
 * Analytical dates, courts, and payment-method filters are intentionally unsupported.
 */
export function getCurrentCustodySummary(
  clubSlug: string,
  params: CurrentCustodySummaryQueryParams = {},
  options: { signal?: AbortSignal } = {},
): Promise<CurrentCustodySummaryResponse> {
  const path = buildCurrentCustodySummaryPath(clubSlug, params)

  return options.signal
    ? apiRequest<CurrentCustodySummaryResponse>(path, { signal: options.signal })
    : apiRequest<CurrentCustodySummaryResponse>(path)
}

function buildPreviewPath(
  clubSlug: string,
  params: SettlementPreviewQueryParams,
): string {
  const query: Record<string, QueryParamValue> = {
    collected_by: params.collected_by,
    page: params.page,
  }

  return buildPathWithQuery(
    apiEndpoints.clubs.settlements.preview(clubSlug),
    query,
  )
}

/**
 * Loads a read-only settlement preview for currently unsettled transactions.
 */
export function getSettlementPreview(
  clubSlug: string,
  params: SettlementPreviewQueryParams,
  options: { signal?: AbortSignal } = {},
): Promise<SettlementPreview> {
  const path = buildPreviewPath(clubSlug, params)

  return options.signal
    ? apiRequest<SettlementPreview>(path, { signal: options.signal })
    : apiRequest<SettlementPreview>(path)
}

export interface GetCurrentCustodyParams {
  collected_by?: number | string
}

export interface GetCurrentCustodyOptions {
  signal?: AbortSignal
  isOwnCustody?: boolean
}

export type CurrentCustodyResult =
  | { kind: 'preview'; data: SettlementPreview }
  | { kind: 'grouped_summary'; data: CurrentCustodySummaryResponse }

/**
 * Unified Current Custody reader:
 * Returns Backend-authoritative live custody amount for one employee (preview)
 * or all club employees (grouped summary).
 * Live custody is never scoped to court.
 */
export async function getCurrentCustody(
  clubSlug: string,
  params: GetCurrentCustodyParams = {},
  options: GetCurrentCustodyOptions = {},
): Promise<CurrentCustodyResult> {
  if (options.isOwnCustody || params.collected_by) {
    const preview = await getSettlementPreview(
      clubSlug,
      params.collected_by ? { collected_by: params.collected_by } : {},
      { signal: options.signal },
    )
    return { kind: 'preview', data: preview }
  }

  const summary = await getCurrentCustodySummary(
    clubSlug,
    {},
    { signal: options.signal },
  )
  return { kind: 'grouped_summary', data: summary }
}

/**
 * Confirms the current unsettled transactions for one collector.
 */
export function createSettlement(
  clubSlug: string,
  payload: CreateSettlementPayload,
): Promise<Settlement> {
  return apiRequest<Settlement>(apiEndpoints.clubs.settlements.list(clubSlug), {
    method: 'POST',
    body: {
      collected_by: payload.collected_by,
      ...(payload.notes?.trim() ? { notes: payload.notes.trim() } : {}),
    },
  })
}

/**
 * Lists prior settlements for the selected club context.
 */
export function listSettlements(
  clubSlug: string,
  params?: SettlementQueryParams,
): Promise<PaginatedResponse<Settlement>> {
  return apiRequest<PaginatedResponse<Settlement>>(
    `${apiEndpoints.clubs.settlements.list(clubSlug)}${buildQueryString(params)}`,
  )
}

/**
 * Fetches one settlement detail with its locked transactions.
 */
export function getSettlement(
  clubSlug: string,
  id: number | string,
): Promise<Settlement> {
  return apiRequest<Settlement>(
    apiEndpoints.clubs.settlements.detail(clubSlug, id),
  )
}

/**
 * Marks one pending settlement as settled through the confirmed backend action.
 */
export function markSettlementSettled(
  clubSlug: string,
  id: number | string,
): Promise<Settlement> {
  return apiRequest<Settlement>(
    apiEndpoints.clubs.settlements.markSettled(clubSlug, id),
    {
      method: 'POST',
    },
  )
}
