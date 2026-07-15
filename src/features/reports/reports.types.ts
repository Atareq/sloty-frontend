import type { PaymentMethod } from '../transactions/transactions.types'

export interface ReportsQueryParams {
  date_from?: string
  date_to?: string
  court?: number | string
  staff?: number | string
  status?: string
  payment_method?: PaymentMethod | ''
}

export interface ReportsTotals {
  bookings_count?: number
  completed_count?: number
  cancelled_count?: number
  no_show_count?: number
  gross_amount?: string
  paid_amount?: string
  remaining_amount?: string
  cancelled_payment_amount?: string
}

export interface ReportsPaymentBreakdown {
  cash?: string
  digital_wallet?: string
  bank_transfer?: string
  other?: string
}

export interface ReportsCourtBreakdown {
  court: number
  court_name: string
  bookings_count?: number
  paid_amount?: string
}

export interface ReportsStaffBreakdown {
  staff: number
  staff_name: string
  transactions_count?: number
  paid_amount?: string
}

export interface ReportsResponse {
  date_from?: string | null
  date_to?: string | null
  totals?: ReportsTotals
  by_payment_method?: ReportsPaymentBreakdown
  by_court?: ReportsCourtBreakdown[]
  by_staff?: ReportsStaffBreakdown[]
}
