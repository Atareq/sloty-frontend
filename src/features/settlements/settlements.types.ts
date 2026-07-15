export type SettlementPaymentMethod =
  | 'CASH'
  | 'DIGITAL_WALLET'
  | 'BANK_TRANSFER'
  | 'OTHER'

export const settlementPaymentMethodLabels: Record<
  SettlementPaymentMethod,
  string
> = {
  CASH: 'نقدي',
  DIGITAL_WALLET: 'محفظة رقمية',
  BANK_TRANSFER: 'تحويل بنكي',
  OTHER: 'أخرى',
}

export interface SettlementPaymentTotals {
  cash: string
  digital_wallet: string
  bank_transfer: string
  other: string
  total: string
}

export interface SettlementStaff {
  id: number
  name: string
}

export interface SettlementTransaction {
  id: number
  booking?: number | null
  amount: string
  payment_method: SettlementPaymentMethod
  reference?: string | null
  created?: string
  created_by?: SettlementStaff | null
  is_settled?: boolean
}

export interface SettlementPreview {
  staff?: SettlementStaff | null
  date_from?: string | null
  date_to?: string | null
  totals: SettlementPaymentTotals
  transactions: SettlementTransaction[]
}

export interface Settlement {
  id: number
  staff?: SettlementStaff | null
  date_from?: string | null
  date_to?: string | null
  totals?: SettlementPaymentTotals
  total_amount?: string
  notes?: string | null
  created?: string
  settled_at?: string
  settled_by?: SettlementStaff | null
  transactions?: SettlementTransaction[]
}

export interface SettlementPreviewParams {
  staff?: number | string
  date_from?: string
  date_to?: string
  page?: number | string
}

export interface SettlementCreatePayload {
  staff?: number | string
  date_from?: string
  date_to?: string
  notes?: string
}
