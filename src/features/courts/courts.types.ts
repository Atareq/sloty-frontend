export interface Court {
  id: number
  club: number
  name: string
  sport_type: string
  default_price: string
  minimum_deposit: string
  cancellation_refund_notice_days: number | null
  slot_duration_minutes: number
  is_active: boolean
  requires_digital_payment_reference: boolean
  internal_hold_expiry_hours: number
  notes?: string
}

export interface CourtPayload {
  name: string
  sport_type: string
  default_price: string
  minimum_deposit: string
  cancellation_refund_notice_days: number | null
  slot_duration_minutes: number
  is_active?: boolean
  requires_digital_payment_reference?: boolean
  internal_hold_expiry_hours?: number
  notes?: string
}
