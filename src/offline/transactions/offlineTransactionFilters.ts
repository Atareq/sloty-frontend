import type {
  Transaction,
  TransactionQueryParams,
} from '../../features/transactions/transactions.types'
import {
  isTransactionDateRangeInsideSyncWindow,
} from './transactionSyncWindow'

export interface OfflineTransactionViewParams extends TransactionQueryParams {
  search?: string
  sort?: 'newest' | 'oldest'
}

export type OfflineTransactionsViewState = 'ready' | 'outside_window'

export interface OfflineTransactionsView {
  state: OfflineTransactionsViewState
  transactions: Transaction[]
}

function normalizeSearchValue(value: string): string {
  return value.trim().toLocaleLowerCase('ar-EG')
}

function getTransactionDate(transaction: Transaction): string {
  return (
    transaction.created ??
    transaction.modified ??
    transaction.booking_start_time ??
    ''
  ).slice(0, 10)
}

function isWithinDateFilters(
  transaction: Transaction,
  params: OfflineTransactionViewParams,
): boolean {
  const transactionDate = getTransactionDate(transaction)

  if (params.date && transactionDate !== params.date) {
    return false
  }

  if (params.date_from && transactionDate < params.date_from) {
    return false
  }

  if (params.date_to && transactionDate > params.date_to) {
    return false
  }

  return true
}

function isMatchingSearch(
  transaction: Transaction,
  rawSearch?: string,
): boolean {
  const search = normalizeSearchValue(rawSearch ?? '')

  if (!search) {
    return true
  }

  const paymentReference = normalizeSearchValue(
    transaction.payment_reference ?? '',
  )

  return Boolean(paymentReference) && paymentReference.includes(search)
}

/**
 * Applies safe local filtering over the complete bounded Transaction cache.
 *
 * Customer name/phone are intentionally not searched because the current
 * Transaction list contract does not provide complete customer context and
 * Task 6 forbids Transaction -> Booking N+1 enrichment.
 */
export function getOfflineTransactionsView(
  transactions: Transaction[],
  params: OfflineTransactionViewParams,
  now = new Date(),
): OfflineTransactionsView {
  if (!isTransactionDateRangeInsideSyncWindow(params, now)) {
    return {
      state: 'outside_window',
      transactions: [],
    }
  }

  const sortDirection = params.sort ?? 'newest'
  const filteredTransactions = transactions
    .filter((transaction) => {
      if (params.court && String(transaction.court) !== String(params.court)) {
        return false
      }

      if (
        params.created_by &&
        String(typeof transaction.created_by === 'number'
          ? transaction.created_by
          : transaction.created_by?.id ?? '') !== String(params.created_by)
      ) {
        return false
      }

      if (
        params.payment_method &&
        transaction.payment_method !== params.payment_method
      ) {
        return false
      }

      if (params.settlement_status) {
        const settlementStatus = transaction.is_settled
          ? 'settled'
          : 'unsettled'

        if (settlementStatus !== params.settlement_status) {
          return false
        }
      }

      if (
        params.is_cancelled !== undefined &&
        params.is_cancelled !== '' &&
        String(transaction.is_cancelled === true) !== String(params.is_cancelled)
      ) {
        return false
      }

      return (
        isWithinDateFilters(transaction, params) &&
        isMatchingSearch(transaction, params.search)
      )
    })
    .sort((first, second) => {
      const firstDate = first.created ?? first.modified ?? ''
      const secondDate = second.created ?? second.modified ?? ''

      return sortDirection === 'oldest'
        ? firstDate.localeCompare(secondDate)
        : secondDate.localeCompare(firstDate)
    })

  return {
    state: 'ready',
    transactions: filteredTransactions,
  }
}
