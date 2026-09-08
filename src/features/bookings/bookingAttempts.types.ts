import type { PaginatedResponse } from '../../shared/api/api.types'

export type BookingAttemptOutcome = 'SUCCESS' | 'REJECTED'
export type BookingAttemptResolution = 'UNRESOLVED' | 'DISMISSED' | 'RESOLVED'
export type BookingAttemptStatus = 'ACCEPTED' | 'REJECTED' | 'DISMISSED'

export interface BookingAttemptQueryParams {
  attempted_by?: number | string
  court?: number | string
  date?: string
  date_from?: string
  date_to?: string
  failure_code?: string
  outcome?: BookingAttemptOutcome | ''
  page?: number | string
  resolution?: BookingAttemptResolution | ''
  status?: BookingAttemptStatus | ''
}

export interface BookingAttempt {
  id: number
  club: number
  court: number
  court_name?: string
  attempted_by?: number | null
  attempted_by_username?: string | null
  client_request_id?: string | null
  customer_name: string
  customer_phone: string
  notes?: string | null
  requested_start: string
  requested_end: string
  requested_at?: string | null
  requested_source?: string | null
  requested_recurring: boolean
  outcome: BookingAttemptOutcome
  resolution: BookingAttemptResolution
  status: BookingAttemptStatus
  failure_code?: string | null
  failure_details?: Record<string, unknown> | null
  resolved_booking?: number | null
  created: string
  modified: string
}

export type BookingAttemptListResponse = PaginatedResponse<BookingAttempt>
