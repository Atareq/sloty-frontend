import { apiRequest } from '../../core/api/apiClient'
import type { PaginatedResponse } from '../../shared/api/api.types'
import { apiEndpoints } from '../../shared/api/apiEndpoints'
import type {
  Transaction,
  TransactionCancelPayload,
  TransactionCreatePayload,
} from './transactions.types'

/**
 * Lists recorded payments for the selected club context.
 *
 * The endpoint path stays in the shared registry so feature code does not
 * duplicate backend URL strings.
 */
export function listTransactions(
  clubSlug: string,
): Promise<PaginatedResponse<Transaction>> {
  return apiRequest<PaginatedResponse<Transaction>>(
    apiEndpoints.clubs.transactions.list(clubSlug),
  )
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
