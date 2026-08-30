import { apiRequest } from '../../core/api/apiClient'
import type { PaginatedResponse } from '../../shared/api/api.types'
import { apiEndpoints } from '../../shared/api/apiEndpoints'
import {
  buildPathWithQuery,
  type QueryParamValue,
} from '../../shared/utils/buildPathWithQuery'
import type {
  Transaction,
  TransactionCancelPayload,
  TransactionCreatePayload,
  TransactionQueryParams,
} from './transactions.types'

function buildTransactionListPath(
  clubSlug: string,
  params: TransactionQueryParams = {},
): string {
  const query: Record<string, QueryParamValue> = {
    court: params.court,
    created_by: params.created_by,
    date: params.date,
    date_from: params.date_from,
    date_to: params.date_to,
    is_cancelled: params.is_cancelled,
    page: params.page,
    payment_method: params.payment_method,
    settlement_status: params.settlement_status,
  }

  return buildPathWithQuery(apiEndpoints.clubs.transactions.list(clubSlug), query)
}

/**
 * Lists recorded payments for the selected club context.
 *
 * The endpoint path stays in the shared registry so feature code does not
 * duplicate backend URL strings.
 */
export function listTransactions(
  clubSlug: string,
  params: TransactionQueryParams = {},
  options: { signal?: AbortSignal } = {},
): Promise<PaginatedResponse<Transaction>> {
  const path = buildTransactionListPath(clubSlug, params)

  if (!options.signal) {
    return apiRequest<PaginatedResponse<Transaction>>(path)
  }

  return apiRequest<PaginatedResponse<Transaction>>(path, {
    signal: options.signal,
  })
}

/**
 * Records one payment transaction in a club-scoped transaction ledger.
 */
export function createTransaction(
  clubSlug: string,
  payload: TransactionCreatePayload,
): Promise<Transaction> {
  return apiRequest<Transaction>(
    apiEndpoints.clubs.transactions.list(clubSlug),
    {
      method: 'POST',
      body: payload,
    },
  )
}

/**
 * Fetches one recorded payment transaction by id.
 */
export function getTransaction(
  clubSlug: string,
  id: number | string,
): Promise<Transaction> {
  return apiRequest<Transaction>(
    apiEndpoints.clubs.transactions.detail(clubSlug, id),
  )
}

/**
 * Cancels a payment transaction with a reason while keeping it visible in the ledger.
 */
export function cancelTransaction(
  clubSlug: string,
  transactionId: number | string,
  payload: TransactionCancelPayload,
): Promise<Transaction> {
  return apiRequest<Transaction>(
    apiEndpoints.clubs.transactions.cancel(clubSlug, transactionId),
    {
      method: 'POST',
      body: payload,
    },
  )
}
