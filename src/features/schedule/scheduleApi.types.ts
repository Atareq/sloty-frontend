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

export interface BookingListParams {
  court: number | string
  date: string
}
