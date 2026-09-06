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
  'RECURRING_RESERVED',
  'HOLD',
  'CONFIRMED',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
  'EXPIRED',
] as const

export const BOOKING_COMPLETION_REQUIRES_FULL_PAYMENT =
  'BOOKING_COMPLETION_REQUIRES_FULL_PAYMENT'

export type BackendBookingStatus = (typeof BACKEND_BOOKING_STATUSES)[number]

export type BookingSlotStatus = (typeof BOOKING_SLOT_STATUSES)[number]

export type BookingRecurrenceStatus = 'ACTIVE' | 'RENEWED' | 'ENDED'

/**
 * Recurrence owner identity for a virtual future slot.
 *
 * RECURRING_RESERVED slots are not concrete Booking rows. Customer and
 * recurrence status come from this context, while occurrence date/time/price
 * come from the selected Schedule slot itself.
 */
export interface RecurringSlotContext {
  anchor_booking_id: number
  customer_name: string
  customer_phone: string
  recurrence_status: BookingRecurrenceStatus
}

/**
 * Backend-owned weekly continuation preview.
 *
 * Loaded from GET bookings/{id}/recurrence-next/. Do not read this from the
 * Booking list/detail payload, and do not calculate the next date, price, or
 * deposit in the frontend.
 */
export interface BookingRecurrenceNextPreview {
  can_continue: boolean
  next_start_time: string
  next_end_time: string
  next_total_price: string
  next_required_deposit: string
  requires_payment_reference: boolean
}

export interface BookingListItem {
  id: number
  court: number
  customer_name?: string
  customer_phone?: string
  notes?: string | null
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
  is_recurring: boolean
  recurrence_status: BookingRecurrenceStatus | null
  previous_recurring_booking_id: number | null
  next_recurring_booking_id: number | null
  hold_expires_at?: string | null
}

export interface BookingCreatePayload {
  court: number
  customer_name: string
  customer_phone: string
  start_time: string
  end_time: string
  client_request_id?: string
  is_recurring?: boolean
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
  is_recurring: boolean
  recurrence_status: BookingRecurrenceStatus | null
}

export interface BookingSlot {
  date: string
  start_time: string
  end_time: string
  slot_status: BookingSlotStatus
  is_available: boolean
  slot_price: string | null
  booking: BookingSlotBookingSummary | null
  recurring_anchor_booking_id: number | null
  recurring_context: RecurringSlotContext | null
  can_start_recurring: boolean | null
  recurring_blocked_reason: string | null
  first_recurring_conflict_start: string | null
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

export interface BookingCompletePayload {
  confirm_collect_remaining_cash?: boolean
  continue_recurring?: boolean | null
  next_deposit_payment_method?: PaymentMethod
  next_deposit_payment_reference?: string
  next_deposit_notes?: string
}

export interface BookingEndRecurrencePayload {
  reason?: string
}

/** PATCH body for customer-data edit. Court, time, status, and recurrence are forbidden. */
export interface BookingCustomerUpdatePayload {
  customer_name: string
  customer_phone: string
  notes: string
}

/**
 * PATCH response contains only the edited customer fields. Refetch Booking
 * detail instead of treating this as a full Booking record.
 */
export interface BookingCustomerUpdateResponse {
  customer_name: string
  customer_phone: string
  notes: string
}

export interface BookingReschedulePayload {
  court: number
  start_time: string
  end_time: string
  reason?: string
}
