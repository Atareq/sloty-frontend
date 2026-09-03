import { apiRequest } from '../../core/api/apiClient'
import type { PaginatedResponse } from '../../shared/api/api.types'
import { apiEndpoints } from '../../shared/api/apiEndpoints'
import type { AuditLogDetail, AuditLogEntry, AuditQueryParams } from './audit.types'

function buildQueryString(params?: AuditQueryParams): string {
  const searchParams = new URLSearchParams()

  if (params?.date_from) {
    searchParams.set('date_from', params.date_from)
  }

  if (params?.date_to) {
    searchParams.set('date_to', params.date_to)
  }

  if (params?.actor) {
    searchParams.set('actor', String(params.actor))
  }

  if (params?.action) {
    searchParams.set('action', params.action)
  }

  if (params?.page) {
    searchParams.set('page', String(params.page))
  }

  const queryString = searchParams.toString()

  return queryString ? `?${queryString}` : ''
}

/**
 * Lists read-only audit log entries for the selected club.
 */
export function listAuditLogs(
  clubSlug: string,
  params?: AuditQueryParams,
): Promise<PaginatedResponse<AuditLogEntry>> {
  return apiRequest<PaginatedResponse<AuditLogEntry>>(
    `${apiEndpoints.clubs.auditLogs.list(clubSlug)}${buildQueryString(params)}`,
  )
}

/**
 * Loads one authoritative audit event detail after the user deliberately opens
 * an activity card. The list never prefetches these details per row.
 */
export function getAuditLog(
  clubSlug: string,
  id: number | string,
): Promise<AuditLogDetail> {
  return apiRequest<AuditLogDetail>(
    apiEndpoints.clubs.auditLogs.detail(clubSlug, id),
  )
}
