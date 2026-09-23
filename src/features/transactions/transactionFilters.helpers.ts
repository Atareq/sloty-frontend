import type { Transaction } from './transactions.types'

export interface TransactionCancelState {
  canCancel: boolean
  isHidden: boolean
  disabledReason?: string
}

/**
 * Keeps cancellation available for online transactions in the backend's
 * cancellation scope. Ownership, settlement, refund, lifecycle, and status
 * eligibility are backend decisions and must not be recreated here.
 */
export function getTransactionCancelState(
  _transaction: Transaction,
  options: {
    isOffline?: boolean
  },
): TransactionCancelState {
  if (options.isOffline) {
    return { canCancel: false, isHidden: true }
  }
    if (_transaction.is_settled) {
    return { canCancel: false, isHidden: true }
  }


  return { canCancel: true, isHidden: false }
}
