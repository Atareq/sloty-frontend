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

/**
 * Server-processed image with Backend-derived public URLs.
 *
 * Backend owns storage: the frontend never builds image URLs or object keys.
 * `thumbnail_url` (≤640px) suits previews; `display_url` (≤1920px) suits detail.
 */
export interface CourtImageAsset {
  id: number
  display_url: string
  thumbnail_url: string
  width: number
  height: number
}

/**
 * One image attached to a Court.
 *
 * GET /api/v1/clubs/{club_slug}/courts/{court_id}/images/ returns these in
 * Backend `position` order; the first item is the Court's primary image.
 */
export interface CourtImage {
  id: number
  position: number
  image: CourtImageAsset
}

/**
 * Backend-authoritative monthly statistics for a court.
 *
 * GET /api/v1/clubs/{club_slug}/courts/{court_id}/monthly-statistics/?month=YYYY-MM
 */
export interface CourtMonthlyStatistics {
  month: string
  total_income: string
  total_bookings: number
}
