export interface Court {
  id: number
  club: number
  name: string
  sport_type: string
  minimum_deposit: string
  cancellation_refund_notice_days: number | null
  slot_duration_minutes: number
  is_active: boolean
  requires_digital_payment_reference: boolean
  internal_hold_expiry_hours: number
  notes?: string
  /** Read-only informational pricing status from Backend. Never used for price calculation. */
  pricing_configured?: boolean
  /** Read-only minimum slot price summary from Backend. Never used for price calculation. */
  minimum_slot_price?: string | null
  /** Read-only maximum slot price summary from Backend. Never used for price calculation. */
  maximum_slot_price?: string | null
}

export type CourtResponse = Court

export interface CourtPayload {
  name: string
  sport_type: string
  minimum_deposit: string
  cancellation_refund_notice_days: number | null
  slot_duration_minutes: number
  is_active?: boolean
  requires_digital_payment_reference?: boolean
  internal_hold_expiry_hours?: number
  notes?: string
}

export type CourtCreateInput = CourtPayload
export type CourtUpdateInput = Partial<CourtPayload>
