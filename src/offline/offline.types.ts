import type { AuthRole, ProfileId, UserId } from '../core/auth/auth.types'
import type { Booking } from '../features/bookings/bookings.types'
import type { Club } from '../features/clubs/clubs.types'
import type { Court } from '../features/courts/courts.types'
import type { BookingSlot } from '../features/schedule/scheduleApi.types'
import type {
  CurrentCustodySummaryResponse,
  SettlementPreview,
} from '../features/settlements/settlements.types'
import type { Transaction } from '../features/transactions/transactions.types'


export const OFFLINE_SCHEMA_VERSION = 5

export interface OfflineScope {
  userId: UserId
  clubSlug: string
}

export interface ScopedOfflineRecord {
  scope_key: string
  user_id: number
  club_slug: string
}

export interface SyncMetadataRecord extends ScopedOfflineRecord {
  operational_last_sync_at?: string
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
  collector_id?: ProfileId
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
 * `collector_scope` distinguishes all-employees, self/current collector,
 * and a selected employee. Current custody is never scoped to court.
 */
export interface CurrentCustodySnapshotRecord extends ScopedOfflineRecord {
  snapshot_kind: CurrentCustodySnapshotKind
  collector_scope: string
  collector_id: ProfileId | null
  payload: CurrentCustodySnapshotPayload
  synced_at: string
}

export const BOOKING_REQUEST_STATUSES = [
  'PENDING_SYNC',
  'SYNCING',
  'BOOKED',
  'NEEDS_REVIEW',
  'DISMISSED',
  'EXPIRED',
] as const

export type BookingRequestStatus = (typeof BOOKING_REQUEST_STATUSES)[number]

export const SYNC_QUEUE_STATUSES = [
  'PENDING',
  'SYNCING',
  'SYNCED',
  'FAILED',
  'NEEDS_REVIEW',
] as const

export type SyncQueueStatus = (typeof SYNC_QUEUE_STATUSES)[number]

export const BOOKING_REQUEST_REVIEW_REASONS = [
  'SLOT_UNAVAILABLE',
  'INVALID_CUSTOMER_DATA',
  'RECURRING_UNAVAILABLE',
  'CLIENT_REQUEST_MISMATCH',
] as const

export type BookingRequestReviewReason =
  (typeof BOOKING_REQUEST_REVIEW_REASONS)[number]

export type OfflineActionType = 'CREATE_BOOKING'

export interface BookingIntentPayload {
  court_id: number
  requested_date: string
  requested_start: string
  requested_end: string
  customer_name: string
  customer_phone: string
  notes: string | null
  requested_recurring: boolean
}

export interface SyncQueueItem<TPayload = BookingIntentPayload> {
  id: string
  action_type: OfflineActionType | string
  payload: TPayload
  created_at: string
  retry_count: number
  status: SyncQueueStatus | BookingRequestStatus
}

/**
 * Local customer intent waiting for a future authenticated Backend submission.
 *
 * `local_id` is local UI/IndexedDB identity. `client_request_id` is the stable
 * Backend idempotency identity for this logical request and must survive
 * app restarts, retries, response loss, and re-authentication.
 */
export interface BookingRequestRecord extends ScopedOfflineRecord {
  local_id: string
  id?: string
  action_type?: OfflineActionType
  type?: OfflineActionType
  client_request_id: string
  court_id: number
  requested_date: string
  requested_start: string
  requested_end: string
  customer_name: string
  customer_phone: string
  notes: string | null
  requested_recurring: boolean
  original_slot_snapshot: BookingSlot
  status: BookingRequestStatus
  retry_count?: number
  review_reason: BookingRequestReviewReason | null
  created_at: string
  updated_at: string
  last_attempt_at: string | null
  resolved_booking_id: number | null
  backend_attempt_id?: number | null
  payload?: BookingIntentPayload
}

export const BOOKING_INTENT_STATUSES = BOOKING_REQUEST_STATUSES
export type BookingIntentStatus = BookingRequestStatus
export type BookingIntentRecord = BookingRequestRecord

export interface OfflineContextRecord extends ScopedOfflineRecord {
  display_name: string
  role: AuthRole
  selected_club_slug: string
  accessible_clubs: Club[]
  accessible_courts: Court[]
  selected_court_id: number | null
  last_verified_at: string
  schema_version: number
}

export interface OfflineContextInput {
  scope: OfflineScope
  displayName: string
  role: AuthRole
  selectedClubSlug: string
  accessibleClubs: Club[]
  accessibleCourts: Court[]
  selectedCourtId: number | null
  lastVerifiedAt: string
}
