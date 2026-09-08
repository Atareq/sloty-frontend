import type { PaginatedResponse } from '../../shared/api/api.types'
import type { PaymentMethod } from './transactions.types'

export type TransactionAttemptOutcome = 'SUCCESS' | 'REJECTED'
export type TransactionAttemptResolution =
  | 'UNRESOLVED'
  | 'DISMISSED'
  | 'RESOLVED'
export type TransactionAttemptStatus = 'ACCEPTED' | 'REJECTED' | 'DISMISSED'

export interface TransactionAttemptQueryParams {
  attempted_by?: number | string
  booking?: number | string
  court?: number | string
  date?: string
  date_from?: string
  date_to?: string
  failure_code?: string
  outcome?: TransactionAttemptOutcome | ''
  page?: number | string
  payment_method?: PaymentMethod | ''
  resolution?: TransactionAttemptResolution | ''
  status?: TransactionAttemptStatus | ''
}

export interface TransactionAttempt {
  id: number
  booking: number
  booking_customer_name?: string | null
  booking_customer_phone?: string | null
  club: number
  court?: number | null
  court_name?: string | null
  amount: string
  payment_method: PaymentMethod
  payment_reference?: string | null
  notes?: string | null
  client_request_id?: string | null
  occurred_at?: string | null
  attempted_by?: number | null
  attempted_by_username?: string | null
  outcome: TransactionAttemptOutcome
  resolution: TransactionAttemptResolution
  status: TransactionAttemptStatus
  failure_code?: string | null
  failure_details?: Record<string, unknown> | null
  resolved_transaction?: number | null
  created: string
  modified: string
}

export type TransactionAttemptListResponse =
  PaginatedResponse<TransactionAttempt>
