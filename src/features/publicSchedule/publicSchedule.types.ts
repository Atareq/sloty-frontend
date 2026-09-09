import type { BookingBoardPeriod } from '../schedule/schedule.types'

/**
 * Public court availability slot as returned by the backend endpoint:
 * GET /api/v1/public/clubs/{club_slug}/courts/{court_id}/availability/
 *
 * This contract is strictly sanitized for guest access and contains no
 * customer names, phone numbers, notes, payments, booking IDs, or internal statuses.
 */
export interface PublicAvailabilitySlot {
  start_time: string
  end_time: string
  availability: 'AVAILABLE' | 'UNAVAILABLE'
}

export interface PublicAvailabilityCourt {
  id: number
  name: string
}

export interface PublicAvailabilityClub {
  id: number
  slug: string
  name: string
}

export interface PublicCourtAvailabilityResponse {
  club: PublicAvailabilityClub
  court: PublicAvailabilityCourt
  date: string
  is_closed: boolean
  opens_at: string | null
  closes_at: string | null
  slot_duration_minutes: number
  slots: PublicAvailabilitySlot[]
}

/**
 * Processed slot for rendering in the public schedule board.
 */
export interface PublicScheduleSlot {
  id: string
  startTime: string
  endTime: string
  isAvailable: boolean
  period: BookingBoardPeriod
  raw: PublicAvailabilitySlot
}

export interface PublicScheduleParams {
  date?: string
}

