import { apiRequest } from '../../core/api/apiClient'
import { apiEndpoints } from '../../shared/api/apiEndpoints'
import {
  buildPathWithQuery,
  type QueryParamValue,
} from '../../shared/utils/buildPathWithQuery'
import type {
  TransactionAttempt,
  TransactionAttemptListResponse,
  TransactionAttemptQueryParams,
} from './transactionAttempts.types'

function buildTransactionAttemptListPath(
  clubSlug: string,
  params: TransactionAttemptQueryParams = {},
): string {
  const query: Record<string, QueryParamValue> = {
    attempted_by: params.attempted_by,
    booking: params.booking,
    court: params.court,
    date: params.date,
    date_from: params.date_from,
    date_to: params.date_to,
    failure_code: params.failure_code,
    outcome: params.outcome,
    page: params.page,
    payment_method: params.payment_method,
    resolution: params.resolution,
    status: params.status,
  }

  return buildPathWithQuery(
    apiEndpoints.clubs.transactionAttempts.list(clubSlug),
    query,
  )
}

/** Lists backend-persisted Transaction attempts separately from the ledger. */
export function listTransactionAttempts(
  clubSlug: string,
  params: TransactionAttemptQueryParams = {},
  options: { signal?: AbortSignal } = {},
): Promise<TransactionAttemptListResponse> {
  const path = buildTransactionAttemptListPath(clubSlug, params)

  if (!options.signal) {
    return apiRequest<TransactionAttemptListResponse>(path)
  }

  return apiRequest<TransactionAttemptListResponse>(path, {
    signal: options.signal,
  })
}

/** Reads one backend-persisted Transaction attempt by id. */
export function getTransactionAttempt(
  clubSlug: string,
  id: number | string,
): Promise<TransactionAttempt> {
  return apiRequest<TransactionAttempt>(
    apiEndpoints.clubs.transactionAttempts.detail(clubSlug, id),
  )
}

/** Dismisses one rejected Transaction attempt on the backend. */
export function dismissTransactionAttempt(
  clubSlug: string,
  id: number | string,
): Promise<TransactionAttempt> {
  return apiRequest<TransactionAttempt>(
    apiEndpoints.clubs.transactionAttempts.dismiss(clubSlug, id),
    { method: 'POST', body: {} },
  )
}
