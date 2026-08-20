import type { PaymentMethod } from '../transactions/transactions.types'

export const BACKEND_BOOKING_STATUSES = [
  'HOLD',
  'CONFIRMED',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
  'EXPIRED',
] as const

export const BOOKING_SLOT_STATUSES = [
  'FREE',
  'UNAVAILABLE',
  'HOLD',
  'CONFIRMED',
  'COMPLETED',
  'NO_SHOW',
] as const

export const BOOKING_COMPLETION_REQUIRES_FULL_PAYMENT =
  'BOOKING_COMPLETION_REQUIRES_FULL_PAYMENT'

export type BackendBookingStatus = (typeof BACKEND_BOOKING_STATUSES)[number]

export type BookingSlotStatus = (typeof BOOKING_SLOT_STATUSES)[number]

export interface BookingListItem {
  id: number
  court: number
  customer_name?: string
  customer_phone?: string
  start_time: string
  end_time: string
  status: BackendBookingStatus
  cancellation_reason?: string | null
  no_show_reason?: string | null
  completed_at?: string | null
  cancelled_at?: string | null
  total_price?: string | null
  paid_amount?: string | null
  remaining_amount?: string | null
  source?: 'MANUAL' | 'ADMIN_CORRECTION' | 'RECURRING'
  is_recurring?: boolean
  recurring_agreement_id?: number | null
}

export interface BookingCreatePayload {
  court: number
  customer_name: string
  customer_phone: string
  start_time: string
  end_time: string
  source?: 'MANUAL' | 'ADMIN_CORRECTION'
  notes?: string
}

export interface BookingCancelPayload {
  reason?: string
  notes?: string
  refund_payment_method?: PaymentMethod
  refund_reference?: string
  refund_notes?: string
}

export interface BookingNoShowPayload {
  reason?: string
  notes?: string
}

export interface BookingListParams {
  court: number | string
  date: string
}

export interface BookingSlotBookingSummary {
  id: number
  status: BackendBookingStatus
  status_label: string
  customer_name: string
  customer_phone: string
  total_booking_value: string
  total_paid_amount: string
  remaining_amount: string
  source?: 'MANUAL' | 'ADMIN_CORRECTION' | 'RECURRING'
  is_recurring?: boolean
  recurring_agreement_id?: number | null
}

export interface BookingSlot {
  date: string
  start_time: string
  end_time: string
  slot_status: BookingSlotStatus
  is_available: boolean
  slot_price: string | null
  booking: BookingSlotBookingSummary | null
  label: string | null
}

export interface BookingSlotsResponse {
  court: number
  court_name: string
  date_from: string
  date_to: string
  slot_duration_minutes: number
  message?: string | null
  slots: BookingSlot[]
}

export interface BookingCancellationPreview {
  booking_id: number
  previewed_at: string
  booking_start: string
  paid_amount: string
  minimum_deposit: string
  refund_notice_days: number | null
  refund_deadline: string | null
  full_refund: boolean
  refund_amount: string
  retained_amount: string
  can_cancel: boolean
}

export interface BookingSlotsSingleDayParams {
  court: number | string
  date: string
  date_from?: never
  date_to?: never
}

export interface BookingSlotsRangeParams {
  court: number | string
  date?: never
  date_from: string
  date_to: string
}

export type BookingSlotsParams =
  | BookingSlotsSingleDayParams
  | BookingSlotsRangeParams
