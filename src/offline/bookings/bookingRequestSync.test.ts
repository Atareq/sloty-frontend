import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ApiClientError } from '../../core/api/apiClient'
import type { BookingListItem } from '../../features/schedule/scheduleApi.types'
import type {
  BookingIntentRecord,
  BookingRequestReviewReason,
  OfflineScope,
} from '../offline.types'
import type { BookingIntentUpdate } from '../repositories/offlineRepositories'
import { createOfflineScopeKey } from '../scope/offlineScope'
import { bookingRequestEditLocks } from './bookingRequestEditLocks'
import {
  STALE_SYNCING_RECOVERY_MS,
  buildBookingCreatePayloadFromRequest,
  classifyBookingRequestSyncError,
  processPendingBookingRequests,
} from './bookingRequestSync'

const scope: OfflineScope = { userId: 1, clubSlug: 'nasr-club' }
const scopeKey = createOfflineScopeKey(scope)
const baseNow = new Date('2026-09-05T12:00:00.000Z')

function makeBookingResponse(id: number): BookingListItem {
  return {
    id,
    court: 7,
    customer_name: 'عميل محلي',
    customer_phone: '+201012345678',
    start_time: '2026-07-20T09:00:00',
    end_time: '2026-07-20T10:00:00',
    status: 'CONFIRMED',
    is_recurring: false,
    recurrence_status: null,
    previous_recurring_booking_id: null,
    next_recurring_booking_id: null,
  }
}

function makeRequest(
  overrides: Partial<BookingIntentRecord> = {},
): BookingIntentRecord {
  return {
    scope_key: scopeKey,
    user_id: 1,
    club_slug: 'nasr-club',
    local_id: 'request-1',
    client_request_id: 'client-request-1',
    court_id: 7,
    requested_date: '2026-07-20',
    requested_start: '2026-07-20T09:00:00',
    requested_end: '2026-07-20T10:00:00',
    customer_name: 'عميل محلي',
    customer_phone: '+201012345678',
    notes: null,
    requested_recurring: false,
    original_slot_snapshot: {
      date: '2026-07-20',
      start_time: '2026-07-20T09:00:00',
      end_time: '2026-07-20T10:00:00',
      slot_status: 'FREE',
      is_available: true,
      slot_price: '300.00',
      booking: null,
      recurring_anchor_booking_id: null,
      recurring_context: null,
      can_start_recurring: true,
      recurring_blocked_reason: null,
      first_recurring_conflict_start: null,
      label: 'متاح',
    },
    status: 'PENDING_SYNC',
    review_reason: null,
    created_at: '2026-07-20T08:00:00.000Z',
    updated_at: '2026-07-20T08:00:00.000Z',
    last_attempt_at: null,
    resolved_booking_id: null,
    ...overrides,
  }
}

function createRepositories(initialRequests: BookingIntentRecord[]) {
  const records = new Map(
    initialRequests.map((request) => [request.local_id, { ...request }]),
  )
  const repositories = {
    getBookingIntent: vi.fn(async (_scope: OfflineScope, localId: string) =>
      records.get(localId),
    ),
    getBookingRequestsForSync: vi.fn(async () =>
      [...records.values()]
        .filter((request) =>
          request.status === 'PENDING_SYNC' || request.status === 'SYNCING',
        )
        .sort((first, second) => {
          const startDifference = first.requested_start.localeCompare(
            second.requested_start,
          )

          return startDifference || first.local_id.localeCompare(second.local_id)
        }),
    ),
    updateBookingIntent: vi.fn(
      async (
        _scope: OfflineScope,
        localId: string,
        updates: BookingIntentUpdate,
      ) => {
        const current = records.get(localId)

        if (!current) {
          return undefined
        }

        const updated = {
          ...current,
          ...updates,
          updated_at: baseNow.toISOString(),
        }

        records.set(localId, updated)
        return updated
      },
    ),
    updateBookingIntentStatus: vi.fn(
      async (
        _scope: OfflineScope,
        localId: string,
        status: BookingIntentRecord['status'],
        options: {
          lastAttemptAt?: string | null
          reviewReason?: BookingRequestReviewReason | null
          resolvedBookingId?: number | null
        } = {},
      ) => {
        const current = records.get(localId)

        if (!current) {
          return undefined
        }

        const updated = {
          ...current,
          status,
          updated_at: baseNow.toISOString(),
          ...(Object.prototype.hasOwnProperty.call(options, 'lastAttemptAt')
            ? { last_attempt_at: options.lastAttemptAt ?? null }
            : {}),
          ...(Object.prototype.hasOwnProperty.call(options, 'reviewReason')
            ? { review_reason: options.reviewReason ?? null }
            : {}),
          ...(Object.prototype.hasOwnProperty.call(options, 'resolvedBookingId')
            ? { resolved_booking_id: options.resolvedBookingId ?? null }
            : {}),
        }

        records.set(localId, updated)
        return updated
      },
    ),
  }

  return {
    records,
    repositories,
  }
}

describe('bookingRequestSync', () => {
  beforeEach(() => {
    bookingRequestEditLocks.resetForTests()
  })

  it('builds a deterministic Backend payload without local-only fields or cached price', () => {
    const request = makeRequest({
      notes: 'ملحوظة',
      requested_recurring: true,
    })

    expect(buildBookingCreatePayloadFromRequest(request)).toEqual({
      court: 7,
      customer_name: 'عميل محلي',
      customer_phone: '+201012345678',
      start_time: '2026-07-20T09:00:00',
      end_time: '2026-07-20T10:00:00',
      client_request_id: 'client-request-1',
      is_recurring: true,
      notes: 'ملحوظة',
    })
    expect(buildBookingCreatePayloadFromRequest(request)).not.toHaveProperty(
      'local_id',
    )
    expect(buildBookingCreatePayloadFromRequest(request)).not.toHaveProperty(
      'slot_price',
    )
  })

  it('auto-syncs one-time requests with client_request_id and marks 201 success BOOKED', async () => {
    const { records, repositories } = createRepositories([makeRequest()])
    const createBooking = vi.fn(async () => makeBookingResponse(77))

    const result = await processPendingBookingRequests({
      scope,
      courtIds: [7],
      repositories,
      createBooking,
      getNow: () => baseNow,
    })

    expect(createBooking).toHaveBeenCalledWith(
      'nasr-club',
      expect.objectContaining({
        client_request_id: 'client-request-1',
        is_recurring: false,
      }),
      expect.any(Object),
    )
    expect(records.get('request-1')?.status).toBe('BOOKED')
    expect(records.get('request-1')?.resolved_booking_id).toBe(77)
    expect(result.booked).toBe(1)
  })

  it('auto-syncs recurring and historical requests without local past-time blocking', async () => {
    const { records, repositories } = createRepositories([
      makeRequest({
        local_id: 'historical-recurring',
        client_request_id: 'historical-id',
        requested_start: '2026-01-01T09:00:00',
        requested_end: '2026-01-01T10:00:00',
        requested_recurring: true,
      }),
    ])
    const createBooking = vi.fn(async () => makeBookingResponse(88))

    await processPendingBookingRequests({
      scope,
      courtIds: [7],
      repositories,
      createBooking,
      getNow: () => baseNow,
    })

    expect(createBooking).toHaveBeenCalledWith(
      'nasr-club',
      expect.objectContaining({
        client_request_id: 'historical-id',
        start_time: '2026-01-01T09:00:00',
        is_recurring: true,
      }),
      expect.any(Object),
    )
    expect(records.get('historical-recurring')?.status).toBe('BOOKED')
  })

  it('treats HTTP 200 idempotent replay as BOOKED', async () => {
    const { records, repositories } = createRepositories([makeRequest()])
    const createBooking = vi.fn(async () => makeBookingResponse(99))

    await processPendingBookingRequests({
      scope,
      courtIds: [7],
      repositories,
      createBooking,
      getNow: () => baseNow,
    })

    expect(records.get('request-1')?.status).toBe('BOOKED')
    expect(records.get('request-1')?.resolved_booking_id).toBe(99)
  })

  it.each([
    ['NETWORK_ERROR', new ApiClientError('network', 0, { code: 'NETWORK_ERROR' })],
    ['TimeoutError', new DOMException('timeout', 'TimeoutError')],
    ['502', new ApiClientError('bad gateway', 502)],
    ['503', new ApiClientError('unavailable', 503)],
    ['504', new ApiClientError('timeout', 504)],
  ])('returns %s failures to PENDING_SYNC for later retry', async (_name, error) => {
    const { records, repositories } = createRepositories([makeRequest()])
    const createBooking = vi.fn(async () => {
      throw error
    })

    const result = await processPendingBookingRequests({
      scope,
      courtIds: [7],
      repositories,
      createBooking,
      getNow: () => baseNow,
    })

    expect(records.get('request-1')?.status).toBe('PENDING_SYNC')
    expect(records.get('request-1')?.client_request_id).toBe('client-request-1')
    expect(result.pendingRetry).toBe(1)
  })

  it.each([
    ['BOOKING_SLOT_UNAVAILABLE', 'SLOT_UNAVAILABLE'],
    ['RECURRING_UNAVAILABLE', 'RECURRING_UNAVAILABLE'],
  ] as const)('maps %s to Needs Review %s', async (code, reason) => {
    const { records, repositories } = createRepositories([makeRequest()])
    const createBooking = vi.fn(async () => {
      throw new ApiClientError('business', 409, { code })
    })

    await processPendingBookingRequests({
      scope,
      courtIds: [7],
      repositories,
      createBooking,
      getNow: () => baseNow,
    })

    expect(records.get('request-1')?.status).toBe('NEEDS_REVIEW')
    expect(records.get('request-1')?.review_reason).toBe(reason)
  })

  it.each(['customer_name', 'customer_phone'] as const)(
    'maps VALIDATION_ERROR field %s to INVALID_CUSTOMER_DATA',
    async (fieldName) => {
      const { records, repositories } = createRepositories([makeRequest()])
      const createBooking = vi.fn(async () => {
        throw new ApiClientError('validation', 400, {
          code: 'VALIDATION_ERROR',
          fieldErrors: {
            [fieldName]: [{ code: 'INVALID', message: 'invalid' }],
          },
        })
      })

      await processPendingBookingRequests({
        scope,
        courtIds: [7],
        repositories,
        createBooking,
        getNow: () => baseNow,
      })

      expect(records.get('request-1')?.status).toBe('NEEDS_REVIEW')
      expect(records.get('request-1')?.review_reason).toBe(
        'INVALID_CUSTOMER_DATA',
      )
    },
  )

  it('does not map unrelated validation errors to INVALID_CUSTOMER_DATA', async () => {
    const { records, repositories } = createRepositories([makeRequest()])
    const createBooking = vi.fn(async () => {
      throw new ApiClientError('validation', 400, {
        code: 'VALIDATION_ERROR',
        fieldErrors: {
          court: [{ code: 'INVALID', message: 'invalid' }],
        },
      })
    })

    const result = await processPendingBookingRequests({
      scope,
      courtIds: [7],
      repositories,
      createBooking,
      getNow: () => baseNow,
    })

    expect(records.get('request-1')?.status).toBe('NEEDS_REVIEW')
    expect(records.get('request-1')?.review_reason).toBeNull()
    expect(result.unknownNonretryable).toBe(1)
  })

  it('preserves request identity and stops retrying on idempotency mismatch', async () => {
    const { records, repositories } = createRepositories([makeRequest()])
    const createBooking = vi.fn(async () => {
      throw new ApiClientError('mismatch', 409, {
        code: 'BOOKING_CLIENT_REQUEST_MISMATCH',
      })
    })

    const result = await processPendingBookingRequests({
      scope,
      courtIds: [7],
      repositories,
      createBooking,
      getNow: () => baseNow,
    })

    expect(records.get('request-1')?.status).toBe('NEEDS_REVIEW')
    expect(records.get('request-1')?.review_reason).toBeNull()
    expect(records.get('request-1')?.client_request_id).toBe('client-request-1')
    expect(result.integrityMismatch).toBe(1)
  })

  it.each([
    ['SESSION_EXPIRED', 'auth_required'],
    ['TOKEN_NOT_VALID', 'auth_required'],
    ['USER_INACTIVE', 'account_unavailable'],
    ['USER_DELETED', 'account_unavailable'],
    ['CLUB_ACCESS_REVOKED', 'club_access_revoked'],
  ] as const)('preserves request and stops queue on %s', async (code, stopReason) => {
    const { records, repositories } = createRepositories([
      makeRequest({ local_id: 'request-1', client_request_id: 'id-1' }),
      makeRequest({ local_id: 'request-2', client_request_id: 'id-2' }),
    ])
    const createBooking = vi.fn(async () => {
      throw new ApiClientError('account', code === 'CLUB_ACCESS_REVOKED' ? 403 : 401, {
        code,
        details: { club_slug: 'nasr-club' },
      })
    })

    const result = await processPendingBookingRequests({
      scope,
      courtIds: [7],
      repositories,
      createBooking,
      getNow: () => baseNow,
    })

    expect(records.get('request-1')?.status).toBe('PENDING_SYNC')
    expect(records.get('request-1')?.client_request_id).toBe('id-1')
    expect(createBooking).toHaveBeenCalledTimes(1)
    expect(records.get('request-2')?.status).toBe('PENDING_SYNC')
    expect(result.stopped).toBe(true)
    expect(result.stopReason).toBe(stopReason)
  })

  it('excludes dismissed and Needs Review requests from automatic sync', async () => {
    const { repositories } = createRepositories([
      makeRequest({ local_id: 'dismissed', status: 'DISMISSED' }),
      makeRequest({ local_id: 'review', status: 'NEEDS_REVIEW' }),
    ])
    const createBooking = vi.fn(async () => makeBookingResponse(1))

    await processPendingBookingRequests({
      scope,
      courtIds: [7],
      repositories,
      createBooking,
      getNow: () => baseNow,
    })

    expect(createBooking).not.toHaveBeenCalled()
  })

  it('excludes live SYNCING and currently edited requests', async () => {
    bookingRequestEditLocks.lock(scopeKey, 'edited')
    const { records, repositories } = createRepositories([
      makeRequest({
        local_id: 'live-syncing',
        status: 'SYNCING',
        last_attempt_at: baseNow.toISOString(),
      }),
      makeRequest({ local_id: 'edited' }),
    ])
    const createBooking = vi.fn(async () => makeBookingResponse(1))

    const result = await processPendingBookingRequests({
      scope,
      courtIds: [7],
      repositories,
      createBooking,
      getNow: () => baseNow,
    })

    expect(createBooking).not.toHaveBeenCalled()
    expect(records.get('live-syncing')?.status).toBe('SYNCING')
    expect(result.skipped).toBe(2)
  })

  it('recovers stale SYNCING with the same client_request_id', async () => {
    const staleAttemptAt = new Date(
      baseNow.getTime() - STALE_SYNCING_RECOVERY_MS - 1,
    ).toISOString()
    const { records, repositories } = createRepositories([
      makeRequest({
        local_id: 'stale-syncing',
        client_request_id: 'same-client-id',
        status: 'SYNCING',
        last_attempt_at: staleAttemptAt,
      }),
    ])
    const createBooking = vi.fn(async () => makeBookingResponse(100))

    await processPendingBookingRequests({
      scope,
      courtIds: [7],
      repositories,
      createBooking,
      getNow: () => baseNow,
    })

    expect(createBooking).toHaveBeenCalledWith(
      'nasr-club',
      expect.objectContaining({ client_request_id: 'same-client-id' }),
      expect.any(Object),
    )
    expect(records.get('stale-syncing')?.status).toBe('BOOKED')
    expect(records.get('stale-syncing')?.resolved_booking_id).toBe(100)
  })

  it('continues after request-level business and technical failures', async () => {
    const { records, repositories } = createRepositories([
      makeRequest({
        local_id: 'conflict',
        client_request_id: 'id-conflict',
        requested_start: '2026-07-20T09:00:00',
        requested_end: '2026-07-20T10:00:00',
      }),
      makeRequest({
        local_id: 'success',
        client_request_id: 'id-success',
        requested_start: '2026-07-20T10:00:00',
        requested_end: '2026-07-20T11:00:00',
      }),
      makeRequest({
        local_id: 'retry',
        client_request_id: 'id-retry',
        requested_start: '2026-07-20T11:00:00',
        requested_end: '2026-07-20T12:00:00',
      }),
    ])
    const createBooking = vi
      .fn()
      .mockRejectedValueOnce(
        new ApiClientError('conflict', 409, {
          code: 'BOOKING_SLOT_UNAVAILABLE',
        }),
      )
      .mockResolvedValueOnce(makeBookingResponse(123))
      .mockRejectedValueOnce(
        new ApiClientError('unavailable', 503),
      )

    const result = await processPendingBookingRequests({
      scope,
      courtIds: [7],
      repositories,
      createBooking,
      getNow: () => baseNow,
    })

    expect(records.get('conflict')?.status).toBe('NEEDS_REVIEW')
    expect(records.get('success')?.status).toBe('BOOKED')
    expect(records.get('retry')?.status).toBe('PENDING_SYNC')
    expect(createBooking).toHaveBeenCalledTimes(3)
    expect(result.booked).toBe(1)
    expect(result.needsReview).toBe(1)
    expect(result.pendingRetry).toBe(1)
  })

  it('classifies without parsing backend message text', () => {
    expect(
      classifyBookingRequestSyncError(
        new ApiClientError('phone slot recurring', 400, {
          code: 'VALIDATION_ERROR',
          fieldErrors: {
            court: [{ code: 'INVALID', message: 'phone message' }],
          },
        }),
      ),
    ).toEqual({ type: 'unknown_nonretryable' })
  })
})
