import { apiRequest } from '../../core/api/apiClient'
import type { PaginatedResponse } from '../../shared/api/api.types'
import { apiEndpoints } from '../../shared/api/apiEndpoints'
import type {
  Transaction,
  TransactionCreatePayload,
} from './transactions.types'

/**
 * Lists recorded payments for one active club.
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

export function getTransaction(
  clubSlug: string,
  id: number | string,
): Promise<Transaction> {
  return apiRequest<Transaction>(
    apiEndpoints.clubs.transactions.detail(clubSlug, id),
  )
}
