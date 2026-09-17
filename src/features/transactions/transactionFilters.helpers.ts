import type { Transaction } from './transactions.types'
import { isRefundTransaction } from './transactions.types'

export interface TransactionCancelState {
  canCancel: boolean
  isHidden: boolean
  disabledReason?: string
}

/**
 * Single unified helper determining whether a transaction can be cancelled,
 * should be rendered as disabled with a clear reason, or should be hidden.
 *
 * Owner and Staff share this exact same logic.
 */
export function getTransactionCancelState(
  transaction: Transaction,
  options: {
    role?: string | null
    currentUserId?: number | null
    isOffline?: boolean
  },
): TransactionCancelState {
  if (isRefundTransaction(transaction)) {
    return { canCancel: false, isHidden: true }
  }

  if (transaction.is_cancelled) {
    return { canCancel: false, isHidden: true }
  }

  if (options.isOffline) {
    return { canCancel: false, isHidden: true }
  }

  if (transaction.is_settled) {
    return {
      canCancel: false,
      isHidden: false,
      disabledReason: 'تم استلام هذه المعاملة ضمن تسوية مالية ولا يمكن إلغاؤها.',
    }
  }

  const createdById =
    typeof transaction.created_by === 'object' && transaction.created_by !== null
      ? transaction.created_by.id
      : typeof transaction.created_by === 'number'
        ? transaction.created_by
        : null

  if (
    options.role === 'STAFF' &&
    options.currentUserId &&
    createdById &&
    options.currentUserId !== createdById
  ) {
    return {
      canCancel: false,
      isHidden: false,
      disabledReason: 'يمكن للموظف إلغاء معاملاته فقط.',
    }
  }

  return { canCancel: true, isHidden: false }
}
