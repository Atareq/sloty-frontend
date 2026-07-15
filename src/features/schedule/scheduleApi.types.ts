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

export interface BookingReschedulePayload {
  court: number
  start_time: string
  end_time: string
}

export interface BookingListParams {
  court: number | string
  date: string
}
