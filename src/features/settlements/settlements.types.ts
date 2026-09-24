import type { ProfileId } from '../../core/auth/auth.types'
import {
  paymentMethodLabels,
  type PaymentMethod,
  type TransactionType,
} from '../transactions/transactions.types'

export type SettlementPaymentMethod = PaymentMethod

/** Settlement rows use the same backend payment-method contract as transactions. */
export const settlementPaymentMethodLabels = paymentMethodLabels

/** Shared Backend fields that describe custody financial totals. */
export interface CurrentCustodyRecord {
  collected_by_name?: string
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

/** Preview/create identity follows the current Backend `collected_by` contract. */
export interface SettlementPreview extends CurrentCustodyRecord {
  club: number
  court?: number | null
  court_name?: string | null
  collected_by: ProfileId
  collected_by_name: string
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
  collected_by?: ProfileId | string
  page?: number | string
}

export interface CurrentCustodySummaryRow extends CurrentCustodyRecord {
  collected_by: number
  collected_by_name: string
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
  collected_by?: ProfileId | string
}

export interface CreateSettlementPayload {
  collected_by: ProfileId
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
  id: ProfileId
  name?: string
}

export interface Settlement {
  id: number
  created_at?: string
  club?: number
  court?: number | null
  court_name?: string | null
  collected_by?: ProfileId | null
  collected_by_name?: string | null
  period_start?: string | null
  period_end?: string | null
  status?: SettlementStatus
  total_amount?: string | null
  transaction_count?: number
  totals_by_payment_method?: Partial<Record<SettlementPaymentMethod, string>>
  notes?: string | null
  created_by?: ProfileId | SettlementActor | null
  settled_by?: ProfileId | SettlementActor | null
  settled_by_name?: string | null
  settled_at?: string | null
  created?: string
  lines?: SettlementLine[]
  transactions?: SettlementPreviewTransaction[]
}

export interface SettlementQueryParams {
  collected_by?: ProfileId | string
  settled_by?: ProfileId | string
  court?: number | string
  page?: number | string
}
