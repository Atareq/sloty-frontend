export type PaymentMethod =
  | 'CASH'
  | 'DIGITAL_WALLET'
  | 'BANK_TRANSFER'
  | 'OTHER'

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  CASH: 'نقدي',
  DIGITAL_WALLET: 'محفظة رقمية',
  BANK_TRANSFER: 'تحويل بنكي',
  OTHER: 'أخرى',
}

export type TransactionType = 'PAYMENT' | 'REFUND'

export const transactionTypeLabels: Record<TransactionType, string> = {
  PAYMENT: 'معاملة',
  REFUND: 'استرداد',
}

export type TransactionSettlementStatus = 'settled' | 'unsettled'

/** Backend list ordering for `created`. Newest first is the Product default. */
export type TransactionOrdering = 'created' | '-created'

export interface TransactionQueryParams {
  date?: string
  date_from?: string
  date_to?: string
  court?: number | string
  payment_method?: PaymentMethod | ''
  created_by?: number | string
  settlement_status?: TransactionSettlementStatus | ''
  is_cancelled?: boolean | string | ''
  page?: number | string
  ordering?: TransactionOrdering | ''
}

export interface Transaction {
  id: number
  booking?: number | null
  transaction_type?: TransactionType
  amount: string
  payment_method: PaymentMethod
  payment_reference?: string | null
  notes?: string | null
  created?: string
  booking_start_time?: string | null
  booking_end_time?: string | null
  court?: number | null
  court_name?: string | null
  created_by_username?: string | null
  modified?: string
  created_by?: number | { id: number; name?: string } | null
  is_settled?: boolean
  is_cancelled?: boolean
  cancelled_by?: number | { id: number; name?: string } | null
  cancelled_at?: string | null
  cancellation_reason?: string | null
}

export interface TransactionCreatePayload {
  booking?: number
  amount: string
  payment_method: PaymentMethod
  payment_reference?: string
  notes?: string
}

export interface TransactionCancelPayload {
  reason: string
}

/**
 * Legacy rows predate transaction_type and are ordinary payment entries.
 */
export function getTransactionType(transaction: {
  transaction_type?: TransactionType
}): TransactionType {
  return transaction.transaction_type ?? 'PAYMENT'
}

export function isRefundTransaction(transaction: {
  transaction_type?: TransactionType
}): boolean {
  return getTransactionType(transaction) === 'REFUND'
}

/**
 * Transaction notes are a detail-oriented field. Empty or whitespace-only
 * values hide the Notes section instead of showing unavailable copy.
 */
export function getTransactionNotes(transaction: {
  notes?: string | null
}): string | null {
  const notes = transaction.notes?.trim()

  return notes ? notes : null
}
