import type { CurrentUserMembership } from '../core/auth/auth.types'
import type { Booking } from '../features/bookings/bookings.types'
import type { BookingSlot } from '../features/schedule/scheduleApi.types'
import type {
  CurrentCustodySummaryResponse,
  SettlementPreview,
} from '../features/settlements/settlements.types'
import type { Transaction } from '../features/transactions/transactions.types'

export const OFFLINE_SCHEMA_VERSION = 2

export interface OfflineScope {
  userId: number
  clubSlug: string
}

export interface ScopedOfflineRecord {
  scope_key: string
  user_id: number
  club_slug: string
}

export interface SyncMetadataRecord extends ScopedOfflineRecord {
  schedule_last_sync_at?: string
  bookings_last_sync_at?: string
  transactions_last_sync_at?: string
  current_custody_last_sync_at?: string
  schema_version: number
  updated_at: string
}

export interface ScheduleDayRecord extends ScopedOfflineRecord {
  court_id: number
  date: string
  message: string | null
  slots: BookingSlot[]
  synced_at: string
}

export interface BookingCacheRecord extends ScopedOfflineRecord {
  booking_id: number
  start_time: string
  status: Booking['status']
  court_id: number
  customer_name: string
  customer_phone: string
  booking: Booking
}

export interface BookingDetailRecord extends ScopedOfflineRecord {
  booking_id: number
  booking: Booking
  cached_at: string
}

export interface TransactionCacheRecord extends ScopedOfflineRecord {
  transaction_id: number
  created_at: string
  payment_method: Transaction['payment_method']
  cancellation_state: 'active' | 'cancelled'
  settlement_state: 'settled' | 'unsettled'
  collector_id?: number
  court_id?: number
  transaction: Transaction
}

export interface TransactionDetailRecord extends ScopedOfflineRecord {
  transaction_id: number
  transaction: Transaction
  cached_at: string
}

export type CurrentCustodySnapshotKind = 'preview' | 'grouped_summary'

export type CurrentCustodySnapshotPayload =
  | SettlementPreview
  | CurrentCustodySummaryResponse

/**
 * Last successful Backend current-custody response for one explicit view scope.
 *
 * `collector_scope` and `court_scope` distinguish all-employees, self/current
 * collector, selected employee, all-courts, and a specific Court.
 */
export interface CurrentCustodySnapshotRecord extends ScopedOfflineRecord {
  snapshot_kind: CurrentCustodySnapshotKind
  collector_scope: string
  collector_id: number | null
  court_scope: string
  court_id: number | null
  payload: CurrentCustodySnapshotPayload
  synced_at: string
}

export const BOOKING_INTENT_STATUSES = [
  'PENDING_RECHECK',
  'READY_TO_BOOK',
  'CONFLICT',
  'BOOKED',
  'DISMISSED',
  'EXPIRED',
] as const

export type BookingIntentStatus = (typeof BOOKING_INTENT_STATUSES)[number]

/**
 * Local-only record for a future reconnect workflow.
 *
 * `local_id` is neither a Backend Booking ID nor an idempotency key and must
 * never be sent to the Booking API.
 */
export interface BookingIntentRecord extends ScopedOfflineRecord {
  local_id: string
  court_id: number
  requested_date: string
  requested_start: string
  requested_end: string
  customer_name: string
  customer_phone: string
  notes: string | null
  original_slot_snapshot: BookingSlot
  status: BookingIntentStatus
  created_at: string
  last_checked_at: string | null
  resolved_booking_id: number | null
}

export interface OfflineContextRecord extends ScopedOfflineRecord {
  display_name: string
  is_platform_admin: boolean
  selected_club_slug: string
  membership_id: number
  role: CurrentUserMembership['role']
  assigned_court_id: number | null
  assigned_court_name: string | null
  last_verified_at: string
  schema_version: number
}

export interface OfflineContextInput {
  scope: OfflineScope
  displayName: string
  isPlatformAdmin: boolean
  membership: CurrentUserMembership
  lastVerifiedAt: string
}
