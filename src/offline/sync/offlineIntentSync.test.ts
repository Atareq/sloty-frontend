import 'fake-indexeddb/auto'
import { describe, expect, it, vi } from 'vitest'
import { ApiClientError } from '../../core/api/apiClient'
import type { BookingListItem } from '../../features/schedule/scheduleApi.types'
import type {
  BookingIntentRecord,
  BookingRequestReviewReason,
  OfflineScope,
} from '../offline.types'
import { createOfflineScopeKey } from '../scope/offlineScope'
import {
  processPendingBookingRequests,
} from '../bookings/bookingRequestSync'
import {
  normalizeBookingRequestRecord,
  toSyncQueueItem,
} from '../bookings/bookingRequestPersistence'
import { offlineRepositories } from '../repositories/offlineRepositories'

const testScope: OfflineScope = { userId: 5, clubSlug: 'test-club' }
const testScopeKey = createOfflineScopeKey(testScope)
const testNow = new Date('2026-09-22T10:00:00.000Z')

function makeBookingResponse(id: number): BookingListItem {
  return {
    id,
    court: 1,
    customer_name: 'أحمد علي',
    customer_phone: '+201012345678',
    start_time: '2026-09-22T12:00:00+03:00',
    end_time: '2026-09-22T13:00:00+03:00',
    status: 'CONFIRMED',
    is_recurring: false,
    recurrence_status: null,
    previous_recurring_booking_id: null,
    next_recurring_booking_id: null,
  }
}

function makeIntentRecord(
  overrides: Partial<BookingIntentRecord> = {},
): BookingIntentRecord {
  return normalizeBookingRequestRecord({
    scope_key: testScopeKey,
    user_id: 5,
    club_slug: 'test-club',
    local_id: 'intent-1',
    client_request_id: '11111111-1111-4111-8111-111111111111',
    court_id: 1,
    requested_date: '2026-09-22',
    requested_start: '2026-09-22T12:00:00+03:00',
    requested_end: '2026-09-22T13:00:00+03:00',
    customer_name: 'أحمد علي',
    customer_phone: '+201012345678',
    notes: 'ملاحظة تجريبية',
    requested_recurring: false,
    original_slot_snapshot: {
      date: '2026-09-22',
      start_time: '2026-09-22T12:00:00+03:00',
      end_time: '2026-09-22T13:00:00+03:00',
      slot_status: 'FREE',
      is_available: true,
      slot_price: '200.00',
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
    created_at: '2026-09-22T09:00:00.000Z',
    updated_at: '2026-09-22T09:00:00.000Z',
    last_attempt_at: null,
    resolved_booking_id: null,
    ...overrides,
  })
}

function createMockRepositories(initialIntents: BookingIntentRecord[]) {
  const records = new Map(
    initialIntents.map((intent) => [intent.local_id, { ...intent }]),
  )

  return {
    records,
    repositories: {
      getBookingIntent: vi.fn(async (_scope: OfflineScope, localId: string) =>
        records.get(localId),
      ),
      getBookingRequestsForSync: vi.fn(async () =>
        [...records.values()]
          .filter(
            (req) => req.status === 'PENDING_SYNC' || req.status === 'SYNCING',
          )
          .sort((a, b) => a.requested_start.localeCompare(b.requested_start)),
      ),
      updateBookingIntent: vi.fn(
        async (_scope: OfflineScope, localId: string, updates) => {
          const current = records.get(localId)
          if (!current) return undefined
          const updated = { ...current, ...updates }
          records.set(localId, updated)
          return updated
        },
      ),
      updateBookingIntentStatus: vi.fn(
        async (
          _scope: OfflineScope,
          localId: string,
          status,
          options?: {
            lastAttemptAt?: string | null
            reviewReason?: BookingRequestReviewReason | null
            resolvedBookingId?: number | null
            backendAttemptId?: number | null
            retryCount?: number
          },
        ) => {
          const current = records.get(localId)
          if (!current) return undefined
          const updated = {
            ...current,
            status,
            ...(options?.lastAttemptAt !== undefined
              ? { last_attempt_at: options.lastAttemptAt }
              : {}),
            ...(options?.reviewReason !== undefined
              ? { review_reason: options.reviewReason }
              : {}),
            ...(options?.resolvedBookingId !== undefined
              ? { resolved_booking_id: options.resolvedBookingId }
              : {}),
            ...(options?.backendAttemptId !== undefined
              ? { backend_attempt_id: options.backendAttemptId }
              : {}),
            ...(options?.retryCount !== undefined
              ? { retry_count: options.retryCount }
              : {}),
          }
          records.set(localId, updated)
          return updated
        },
      ),
    },
  }
}

describe('Offline Intent and Sync Architecture Contract', () => {
  describe('Phase 2 & 3: Offline creation creates Intent, not Booking', () => {
    it('creates an Intent record with action_type and payload without creating a confirmed Booking', async () => {
      const intentInput = {
        local_id: 'offline-intent-101',
        court_id: 1,
        requested_date: '2026-09-22',
        requested_start: '2026-09-22T12:00:00+03:00',
        requested_end: '2026-09-22T13:00:00+03:00',
        customer_name: 'طارق علي',
        customer_phone: '+201099998888',
        notes: 'حجز أوفلاين',
        requested_recurring: false,
        original_slot_snapshot: {
          date: '2026-09-22',
          start_time: '2026-09-22T12:00:00+03:00',
          end_time: '2026-09-22T13:00:00+03:00',
          slot_status: 'FREE' as const,
          is_available: true,
          slot_price: '200.00',
          booking: null,
          recurring_anchor_booking_id: null,
          recurring_context: null,
          can_start_recurring: true,
          recurring_blocked_reason: null,
          first_recurring_conflict_start: null,
          label: 'متاح',
        },
        status: 'PENDING_SYNC' as const,
        created_at: '2026-09-22T08:00:00.000Z',
        resolved_booking_id: null,
      }

      await offlineRepositories.saveBookingIntent(testScope, intentInput)

      const savedRecord = await offlineRepositories.getBookingIntent(
        testScope,
        'offline-intent-101',
      )

      expect(savedRecord).toBeDefined()
      // Verifies Intent properties
      expect(savedRecord?.action_type).toBe('CREATE_BOOKING')
      expect(savedRecord?.status).toBe('PENDING_SYNC')
      expect(savedRecord?.status).not.toBe('CONFIRMED')
      expect(savedRecord?.resolved_booking_id).toBeNull()
      expect(savedRecord?.client_request_id).toBeDefined()
      expect(savedRecord?.payload).toEqual({
        court_id: 1,
        requested_date: '2026-09-22',
        requested_start: '2026-09-22T12:00:00+03:00',
        requested_end: '2026-09-22T13:00:00+03:00',
        customer_name: 'طارق علي',
        customer_phone: '+201099998888',
        notes: 'حجز أوفلاين',
        requested_recurring: false,
      })

      // Verifies queue item representation
      const queueItem = toSyncQueueItem(savedRecord!)
      expect(queueItem).toEqual({
        id: 'offline-intent-101',
        action_type: 'CREATE_BOOKING',
        payload: {
          court_id: 1,
          requested_date: '2026-09-22',
          requested_start: '2026-09-22T12:00:00+03:00',
          requested_end: '2026-09-22T13:00:00+03:00',
          customer_name: 'طارق علي',
          customer_phone: '+201099998888',
          notes: 'حجز أوفلاين',
          requested_recurring: false,
        },
        created_at: '2026-09-22T08:00:00.000Z',
        retry_count: 0,
        status: 'PENDING',
      })

      // Verifies it was NOT written to the bookings cache
      const cachedBookings = await offlineRepositories.readCachedBookings(testScope)
      expect(cachedBookings.some((b) => b.id === 101)).toBe(false)
    })
  })

  describe('Phase 4: Sync success transitions PENDING to SYNCED (BOOKED)', () => {
    it('transitions PENDING queue item to BOOKED/SYNCED with resolved_booking_id on 201 Created', async () => {
      const intent = makeIntentRecord({ local_id: 'pending-item' })
      const { records, repositories } = createMockRepositories([intent])
      const createBooking = vi.fn(async () => makeBookingResponse(901))

      const result = await processPendingBookingRequests({
        scope: testScope,
        courtIds: [1],
        repositories,
        createBooking,
        getNow: () => testNow,
      })

      expect(result.booked).toBe(1)
      const syncedRecord = records.get('pending-item')
      expect(syncedRecord?.status).toBe('BOOKED')
      expect(syncedRecord?.resolved_booking_id).toBe(901)
      expect(syncedRecord?.retry_count).toBe(1)

      const queueView = toSyncQueueItem(syncedRecord!)
      expect(queueView.status).toBe('SYNCED')
    })
  })

  describe('Phase 6: Sync failure transitions to NEEDS_REVIEW upon business conflict', () => {
    it('transitions item to NEEDS_REVIEW with review_reason when backend rejects with conflict', async () => {
      const intent = makeIntentRecord({ local_id: 'conflict-item' })
      const { records, repositories } = createMockRepositories([intent])
      const createBooking = vi.fn(async () => {
        throw new ApiClientError('Slot already booked', 409, {
          code: 'BOOKING_SLOT_UNAVAILABLE',
        })
      })

      const result = await processPendingBookingRequests({
        scope: testScope,
        courtIds: [1],
        repositories,
        createBooking,
        getNow: () => testNow,
      })

      expect(result.needsReview).toBe(1)
      const reviewRecord = records.get('conflict-item')
      expect(reviewRecord?.status).toBe('NEEDS_REVIEW')
      expect(reviewRecord?.review_reason).toBe('SLOT_UNAVAILABLE')
      expect(reviewRecord?.resolved_booking_id).toBeNull()
      expect(reviewRecord?.retry_count).toBe(1)

      const queueView = toSyncQueueItem(reviewRecord!)
      expect(queueView.status).toBe('NEEDS_REVIEW')
    })
  })

  describe('Phase 5: Duplicate Protection via client_request_id', () => {
    it('reuses the exact same client_request_id across retries to ensure backend deduplication', async () => {
      const intent = makeIntentRecord({
        local_id: 'retry-item',
        client_request_id: '99999999-9999-4999-8999-999999999999',
      })
      const { records, repositories } = createMockRepositories([intent])

      // First attempt: network error
      const createBooking = vi
        .fn()
        .mockRejectedValueOnce(new ApiClientError('Network disconnected', 0, { code: 'NETWORK_ERROR' }))
        .mockResolvedValueOnce(makeBookingResponse(999))

      // 1st sync attempt: fails with network error
      const firstResult = await processPendingBookingRequests({
        scope: testScope,
        courtIds: [1],
        repositories,
        createBooking,
        getNow: () => testNow,
      })

      expect(firstResult.pendingRetry).toBe(1)
      const afterFirstTry = records.get('retry-item')
      expect(afterFirstTry?.status).toBe('PENDING_SYNC')
      expect(afterFirstTry?.client_request_id).toBe('99999999-9999-4999-8999-999999999999')
      expect(afterFirstTry?.retry_count).toBe(1)

      // 2nd sync attempt: network recovered, succeeds
      const secondResult = await processPendingBookingRequests({
        scope: testScope,
        courtIds: [1],
        repositories,
        createBooking,
        getNow: () => new Date('2026-09-22T10:05:00.000Z'),
      })

      expect(secondResult.booked).toBe(1)
      const afterSecondTry = records.get('retry-item')
      expect(afterSecondTry?.status).toBe('BOOKED')
      expect(afterSecondTry?.resolved_booking_id).toBe(999)
      expect(afterSecondTry?.client_request_id).toBe('99999999-9999-4999-8999-999999999999')
      expect(afterSecondTry?.retry_count).toBe(2)

      // Assert both calls sent the SAME client_request_id
      expect(createBooking).toHaveBeenCalledTimes(2)
      expect(createBooking.mock.calls[0][1]).toEqual(
        expect.objectContaining({ client_request_id: '99999999-9999-4999-8999-999999999999' }),
      )
      expect(createBooking.mock.calls[1][1]).toEqual(
        expect.objectContaining({ client_request_id: '99999999-9999-4999-8999-999999999999' }),
      )
    })
  })

  describe('Phase 8: Network Recovery and Queue Item Isolation', () => {
    it('processes multiple queued actions independently without allowing one failure to block others', async () => {
      const intent1 = makeIntentRecord({
        local_id: 'item-conflict',
        client_request_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        requested_start: '2026-09-22T10:00:00+03:00',
        requested_end: '2026-09-22T11:00:00+03:00',
      })
      const intent2 = makeIntentRecord({
        local_id: 'item-success',
        client_request_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        requested_start: '2026-09-22T11:00:00+03:00',
        requested_end: '2026-09-22T12:00:00+03:00',
      })
      const intent3 = makeIntentRecord({
        local_id: 'item-network-fail',
        client_request_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        requested_start: '2026-09-22T12:00:00+03:00',
        requested_end: '2026-09-22T13:00:00+03:00',
      })

      const { records, repositories } = createMockRepositories([
        intent1,
        intent2,
        intent3,
      ])

      const createBooking = vi
        .fn()
        // item 1: 409 Conflict
        .mockRejectedValueOnce(
          new ApiClientError('Slot unavailable', 409, {
            code: 'BOOKING_SLOT_UNAVAILABLE',
          }),
        )
        // item 2: 201 Created
        .mockResolvedValueOnce(makeBookingResponse(702))
        // item 3: 503 Service Unavailable
        .mockRejectedValueOnce(
          new ApiClientError('Server unavailable', 503),
        )

      const result = await processPendingBookingRequests({
        scope: testScope,
        courtIds: [1],
        repositories,
        createBooking,
        getNow: () => testNow,
      })

      // Verify all 3 were processed
      expect(createBooking).toHaveBeenCalledTimes(3)
      expect(result.processed).toBe(3)
      expect(result.needsReview).toBe(1)
      expect(result.booked).toBe(1)
      expect(result.pendingRetry).toBe(1)

      // Verify each individual state is preserved
      expect(records.get('item-conflict')?.status).toBe('NEEDS_REVIEW')
      expect(records.get('item-conflict')?.review_reason).toBe('SLOT_UNAVAILABLE')

      expect(records.get('item-success')?.status).toBe('BOOKED')
      expect(records.get('item-success')?.resolved_booking_id).toBe(702)

      expect(records.get('item-network-fail')?.status).toBe('PENDING_SYNC')
      expect(records.get('item-network-fail')?.client_request_id).toBe('cccccccc-cccc-4ccc-8ccc-cccccccccccc')
    })
  })
})
