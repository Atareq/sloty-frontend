import type { PaymentMethod } from '../transactions/transactions.types'

export const RECURRING_AGREEMENT_STATUSES = [
  'ACTIVE',
  'CANCELLED',
  'ACTION_REQUIRED',
] as const

export const RECURRING_DEPOSIT_STATUSES = [
  'HELD',
  'REFUND_DUE',
  'REFUNDED',
  'FORFEITED',
] as const

export type RecurringAgreementStatus =
  (typeof RECURRING_AGREEMENT_STATUSES)[number]

export type RecurringDepositStatus =
  (typeof RECURRING_DEPOSIT_STATUSES)[number]

export const recurringAgreementStatusLabels: Record<
  RecurringAgreementStatus,
  string
> = {
  ACTIVE: 'نشط',
  CANCELLED: 'ملغي',
  ACTION_REQUIRED: 'يحتاج إجراء',
}

export const recurringDepositStatusLabels: Record<
  RecurringDepositStatus,
  string
> = {
  HELD: 'محتجز',
  REFUND_DUE: 'مستحق للاسترداد',
  REFUNDED: 'تم الاسترداد',
  FORFEITED: 'تم احتجازه',
}

export interface RecurringAgreement {
  id: number
  club: number
  court: number
  court_name?: string | null
  customer_name: string
  customer_phone: string
  weekday: number
  start_time: string
  end_time: string
  start_date: string
  status: RecurringAgreementStatus
  deposit_amount: string
  deposit_status: RecurringDepositStatus
  deposit_collected_at: string
  deposit_collected_by: number | null
  cancellation_requested_at: string | null
  cancellation_effective_date: string | null
  cancelled_by: number | null
  cancelled_by_name?: string | null
  cancellation_reason: string
  refund_due_at: string | null
  refunded_at: string | null
  refunded_by: number | null
  action_required_code: string
  failed_occurrence_start: string | null
  action_required_at: string | null
  notes: string
  created_by: number | null
  created: string
  modified: string
}

export interface RecurringAgreementCreatePayload {
  court: number
  customer_name: string
  customer_phone: string
  weekday: number
  start_time: string
  end_time: string
  start_date: string
  payment_method: PaymentMethod
  reference?: string
  notes?: string
}

export interface RecurringAgreementAvailabilityParams {
  court: number | string
  weekday: number | string
  start_time: string
  end_time: string
  start_date: string
}

export interface RecurringAgreementAvailabilitySlot {
  date: string
  start_time: string
  end_time: string
  available: boolean
  slot_price: string | null
  failure_code: string | null
}

export interface RecurringAgreementAvailabilityResponse {
  court: number
  weekday: number
  start_time: string
  end_time: string
  start_date: string
  horizon_weeks: number
  slots: RecurringAgreementAvailabilitySlot[]
  all_available: boolean
}

export interface RecurringAgreementCancellationPreview {
  effective_date?: string | null
  reason?: string
  message?: string
  deposit_status?: RecurringDepositStatus
  refund_due_at?: string | null
}

export interface RecurringAgreementCancelPayload {
  effective_date?: string
  reason: string
}
