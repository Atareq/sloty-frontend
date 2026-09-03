import {
  paymentMethodLabels,
  type PaymentMethod,
  type TransactionType,
} from '../transactions/transactions.types'

export type SettlementPaymentMethod = PaymentMethod

/** Settlement rows use the same backend payment-method contract as transactions. */
export const settlementPaymentMethodLabels = paymentMethodLabels

/** Shared Backend fields that describe one collector's current custody. */
export interface CurrentCustodyRecord {
  collected_by: number
  collected_by_name: string
  transaction_count: number
  net_amount: string
  totals_by_payment_method: Partial<Record<SettlementPaymentMethod, string>>
}

export interface SettlementPreviewTransaction {
  id: number
  booking?: number | null
  court?: number | null
  court_name?: string | null
  transaction_type?: TransactionType
  amount: string
  payment_method: SettlementPaymentMethod
  payment_reference?: string | null
  created?: string
}

export interface SettlementPreview extends CurrentCustodyRecord {
  club: number
  court?: number | null
  court_name?: string | null
  is_self_preview: boolean
  can_approve: boolean
  approval_required: boolean
  period_start: string
  period_end: string
  total_amount: string
  booking_payments: string
  booking_refunds: string
  transactions: SettlementPreviewTransaction[]
}

export interface SettlementPreviewQueryParams {
  collected_by?: number | string
  court?: number | string
  page?: number | string
}

export interface CurrentCustodySummaryRow extends CurrentCustodyRecord {
  period_start: string
  period_end: string
  total_amount: string
  booking_payments: string
  booking_refunds: string
  is_self: boolean
  can_approve: boolean
}

export interface CurrentCustodySummaryResponse {
  results: CurrentCustodySummaryRow[]
}

export interface CurrentCustodySummaryQueryParams {
  collected_by?: number | string
  court?: number | string
}

export interface CreateSettlementPayload {
  collected_by: number
  court?: number
  notes?: string
}

export type SettlementStatus = 'PENDING' | 'SETTLED'

export const settlementStatusLabels: Record<SettlementStatus, string> = {
  PENDING: 'قيد المراجعة',
  SETTLED: 'مسواة',
}

export interface SettlementLine {
  id: number
  transaction: number
  transaction_type?: TransactionType
  amount: string
  payment_method: SettlementPaymentMethod
}

export interface SettlementActor {
  id: number
  name?: string
}

export interface Settlement {
  id: number
  created_at?: string
  club?: number
  court?: number | null
  collected_by?: number | null
  collected_by_name?: string | null
  period_start?: string | null
  period_end?: string | null
  status?: SettlementStatus
  total_amount?: string | null
  transaction_count?: number
  totals_by_payment_method?: Partial<Record<SettlementPaymentMethod, string>>
  notes?: string | null
  created_by?: number | SettlementActor | null
  settled_by?: number | SettlementActor | null
  settled_at?: string | null
  created?: string
  lines?: SettlementLine[]
  transactions?: SettlementPreviewTransaction[]
}

export interface SettlementQueryParams {
  collected_by?: number | string
  status?: SettlementStatus | ''
  court?: number | string
  page?: number | string
}
