import { apiRequest } from '../../core/api/apiClient'
import type { PaginatedResponse } from '../../shared/api/api.types'
import { apiEndpoints } from '../../shared/api/apiEndpoints'
import type {
  Settlement,
  SettlementCreatePayload,
  SettlementPreview,
  SettlementPreviewParams,
} from './settlements.types'

function buildQueryString(params?: SettlementPreviewParams): string {
  const searchParams = new URLSearchParams()

  if (params?.staff) {
    searchParams.set('staff', String(params.staff))
  }

  if (params?.date_from) {
    searchParams.set('date_from', params.date_from)
  }

  if (params?.date_to) {
    searchParams.set('date_to', params.date_to)
  }

  if (params?.page) {
    searchParams.set('page', String(params.page))
  }

  const queryString = searchParams.toString()

  return queryString ? `?${queryString}` : ''
}

/**
 * Loads the backend settlement preview for unsettled transactions.
 */
export function getSettlementPreview(
  clubSlug: string,
  params?: SettlementPreviewParams,
): Promise<SettlementPreview> {
  return apiRequest<SettlementPreview>(
    `${apiEndpoints.clubs.settlements.preview(clubSlug)}${buildQueryString(params)}`,
  )
}

/**
 * Creates one staff settlement and lets the backend lock included transactions.
 */
export function createSettlement(
  clubSlug: string,
  payload: SettlementCreatePayload,
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
  params?: SettlementPreviewParams,
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
