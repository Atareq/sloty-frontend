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

export interface Transaction {
  id: number
  booking?: number | null
  amount: string
  payment_method: PaymentMethod
  reference?: string | null
  notes?: string | null
  created?: string
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
  reference?: string
  notes?: string
}

export interface TransactionCancelPayload {
  reason: string
}
