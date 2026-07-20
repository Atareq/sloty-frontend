import { apiRequest } from '../../core/api/apiClient'
import type { PaginatedResponse } from '../../shared/api/api.types'
import { apiEndpoints } from '../../shared/api/apiEndpoints'
import type {
  ConfirmSettlementRequest,
  ReviewSettlementRequest,
  Settlement,
  SettlementPreview,
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

/**
 * Reviews all currently unsettled transactions collected by one club user.
 */
export function reviewUserSettlement(
  clubSlug: string,
  payload: ReviewSettlementRequest,
): Promise<SettlementPreview> {
  return apiRequest<SettlementPreview>(
    apiEndpoints.clubs.settlements.list(clubSlug),
    {
      method: 'POST',
      body: payload,
    },
  )
}

/**
 * Confirms a settlement for every currently unsettled transaction of one user.
 */
export function confirmUserSettlement(
  clubSlug: string,
  payload: ConfirmSettlementRequest,
): Promise<Settlement> {
  return apiRequest<Settlement>(apiEndpoints.clubs.settlements.list(clubSlug), {
    method: 'POST',
    body: payload,
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
