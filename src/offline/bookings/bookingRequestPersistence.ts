import type {
  BookingRequestRecord,
  BookingRequestReviewReason,
  BookingRequestStatus,
  ScopedOfflineRecord,
} from '../offline.types'

type LegacyBookingIntentStatus =
  | 'PENDING_RECHECK'
  | 'READY_TO_BOOK'
  | 'CONFLICT'
  | 'BOOKED'
  | 'DISMISSED'
  | 'EXPIRED'

type PersistedBookingRequestLike = Partial<BookingRequestRecord> &
  Partial<ScopedOfflineRecord> & {
    last_checked_at?: string | null
    review_reason?: string | null
    status?: BookingRequestStatus | LegacyBookingIntentStatus | string
  }

export const legacyBookingIntentStatuses = [
  'PENDING_RECHECK',
  'READY_TO_BOOK',
  'CONFLICT',
  'BOOKED',
  'DISMISSED',
  'EXPIRED',
] as const

export const unresolvedBookingRequestStatuses: BookingRequestStatus[] = [
  'PENDING_SYNC',
  'SYNCING',
  'NEEDS_REVIEW',
  'EXPIRED',
]

function createFallbackId(): string {
  return `booking-request-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/**
 * Generates the stable Backend idempotency key for one local Booking Request.
 * The caller must persist the returned value immediately and must never
 * regenerate it for the same logical request.
 */
export function createBookingRequestClientRequestId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? `booking-request-${crypto.randomUUID()}`
    : createFallbackId()
}

export function mapLegacyBookingIntentStatus(
  status: string | undefined,
): {
  reviewReason: BookingRequestReviewReason | null
  status: BookingRequestStatus
} {
  switch (status) {
    case 'BOOKED':
      return { reviewReason: null, status: 'BOOKED' }
    case 'DISMISSED':
      return { reviewReason: null, status: 'DISMISSED' }
    case 'CONFLICT':
      return { reviewReason: 'SLOT_UNAVAILABLE', status: 'NEEDS_REVIEW' }
    case 'SYNCING':
      return { reviewReason: null, status: 'SYNCING' }
    case 'NEEDS_REVIEW':
      return { reviewReason: null, status: 'NEEDS_REVIEW' }
    case 'EXPIRED':
      // Legacy EXPIRED was assigned only because the appointment time passed.
      // Historical Booking Requests are now valid, so preserve the customer
      // intent as recoverable work instead of terminalizing it.
      return { reviewReason: null, status: 'PENDING_SYNC' }
    case 'READY_TO_BOOK':
    case 'PENDING_RECHECK':
    case 'PENDING_SYNC':
    default:
      return { reviewReason: null, status: 'PENDING_SYNC' }
  }
}

function normalizeReviewReason(
  value: string | null | undefined,
  fallback: BookingRequestReviewReason | null,
): BookingRequestReviewReason | null {
  if (
    value === 'SLOT_UNAVAILABLE' ||
    value === 'INVALID_CUSTOMER_DATA' ||
    value === 'RECURRING_UNAVAILABLE'
  ) {
    return value
  }

  return fallback
}

/**
 * Converts legacy BookingIntent rows and partially written rows into the
 * canonical persisted Booking Request shape without changing scope identity or
 * local identity.
 */
export function normalizeBookingRequestRecord(
  record: PersistedBookingRequestLike,
  options: {
    generateClientRequestId?: () => string
    now?: string
  } = {},
): BookingRequestRecord {
  const now = options.now ?? new Date().toISOString()
  const generatedClientRequestId =
    options.generateClientRequestId ?? createBookingRequestClientRequestId
  const mappedStatus = mapLegacyBookingIntentStatus(record.status)
  const createdAt = record.created_at ?? now

  return {
    ...record,
    scope_key: record.scope_key ?? '',
    user_id: record.user_id ?? 0,
    club_slug: record.club_slug ?? '',
    local_id: record.local_id ?? generatedClientRequestId(),
    client_request_id: record.client_request_id ?? generatedClientRequestId(),
    court_id: record.court_id ?? 0,
    requested_date: record.requested_date ?? '',
    requested_start: record.requested_start ?? '',
    requested_end: record.requested_end ?? '',
    customer_name: record.customer_name ?? '',
    customer_phone: record.customer_phone ?? '',
    notes: record.notes ?? null,
    requested_recurring: record.requested_recurring === true,
    original_slot_snapshot: record.original_slot_snapshot,
    status: mappedStatus.status,
    review_reason: normalizeReviewReason(
      record.review_reason,
      mappedStatus.reviewReason,
    ),
    created_at: createdAt,
    updated_at: record.updated_at ?? record.last_checked_at ?? createdAt,
    last_attempt_at: record.last_attempt_at ?? null,
    resolved_booking_id: record.resolved_booking_id ?? null,
  } as BookingRequestRecord
}
