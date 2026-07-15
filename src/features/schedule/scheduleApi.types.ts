export type BackendBookingStatus =
  | 'HOLD'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW'
  | 'EXPIRED'

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
}

export interface BookingNoShowPayload {
  reason?: string
  notes?: string
}

export interface BookingCompletePayload {
  confirm_remaining_cash?: boolean
}

export interface BookingListParams {
  court: number | string
  date: string
}
