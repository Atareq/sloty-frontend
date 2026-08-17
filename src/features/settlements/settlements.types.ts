import type { TransactionType } from '../transactions/transactions.types'

export type SettlementPaymentMethod =
  | 'CASH'
  | 'DIGITAL_WALLET'
  | 'BANK_TRANSFER'
  | 'OTHER'

export const settlementPaymentMethodLabels: Record<
  SettlementPaymentMethod,
  string
> = {
  CASH: 'كاش',
  DIGITAL_WALLET: 'محفظة إلكترونية',
  BANK_TRANSFER: 'تحويل بنكي',
  OTHER: 'أخرى',
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
  reference?: string | null
  created?: string
}

export interface SettlementPreview {
  dry_run?: true
  created?: false
  club: number
  collected_by: number
  collected_by_name: string
  court?: number | null
  court_name?: string | null
  is_self_preview?: boolean
  can_approve?: boolean
  approval_required?: boolean
  period_start?: string
  period_end?: string
  transaction_count: number
  total_amount: string
  totals_by_payment_method: Partial<Record<SettlementPaymentMethod, string>>
  transactions: SettlementPreviewTransaction[]
}

export interface SettlementPreviewQueryParams {
  collected_by?: number | string
  court?: number | string
  page?: number | string
}

export interface CreateSettlementPayload {
  collected_by: number
  court?: number
  notes?: string
}

export interface ReviewSettlementRequest {
  collected_by: number
  dry_run: true
}

export interface ConfirmSettlementRequest {
  collected_by: number
  dry_run: false
  notes?: string
}

export type SettlementStatus = 'PENDING' | 'SETTLED' | 'CANCELLED'

export const settlementStatusLabels: Record<SettlementStatus, string> = {
  PENDING: 'قيد المراجعة',
  SETTLED: 'مسواة',
  CANCELLED: 'ملغية',
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
  dry_run?: false
  created_at?: string
  club?: number
  court?: number | null
  collected_by?: number | null
  collected_by_name?: string | null
  period_start?: string | null
  period_end?: string | null
  status?: SettlementStatus | string
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
  status?: string
  court?: number | string
  page?: number | string
}
