import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Booking } from '../../features/bookings/bookings.types'
import type { BookingSlot } from '../../features/schedule/scheduleApi.types'
import type { Transaction } from '../../features/transactions/transactions.types'
import { clearAuthTokens, getAccessToken } from '../../core/auth/authStorage'
import { SlotyLocalDatabase } from '../db/SlotyLocalDatabase'
import { unresolvedBookingRequestStatuses } from '../bookings/bookingRequestPersistence'
import {
  BOOKING_REQUEST_STATUSES,
  OFFLINE_SCHEMA_VERSION,
  type OfflineScope,
} from '../offline.types'
import { createOfflineScopeKey } from '../scope/offlineScope'
import {
  createOfflineRepositories,
  type BookingIntentInput,
} from './offlineRepositories'

const userOneClubA: OfflineScope = { userId: 1, clubSlug: 'club-a' }
const userOneClubB: OfflineScope = { userId: 1, clubSlug: 'club-b' }
const userTwoClubA: OfflineScope = { userId: 2, clubSlug: 'club-a' }

const slot: BookingSlot = {
  date: '2026-08-30',
  start_time: '2026-08-30T18:00:00+03:00',
  end_time: '2026-08-30T19:00:00+03:00',
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
}

function createBooking(id: number, customerName = `عميل ${id}`): Booking {
  return {
    id,
    court: 7,
    customer_name: customerName,
    customer_phone: `+2010000000${id}`,
    start_time: `2026-08-${String(20 + id).padStart(2, '0')}T18:00:00+03:00`,
    end_time: `2026-08-${String(20 + id).padStart(2, '0')}T19:00:00+03:00`,
    status: 'CONFIRMED',
    is_recurring: false,
    recurrence_status: null,
    previous_recurring_booking_id: null,
    next_recurring_booking_id: null,
  }
}

function createTransaction(id: number): Transaction {
  return {
    id,
    booking: id,
    amount: '100.00',
    payment_method: 'CASH',
    created: `2026-08-${String(20 + id).padStart(2, '0')}T18:05:00+03:00`,
    court: 7,
    created_by: 15,
    is_cancelled: false,
    is_settled: false,
  }
}

function createIntent(
  localId: string,
  courtId = 7,
  overrides: Partial<BookingIntentInput> = {},
): BookingIntentInput {
  return {
    local_id: localId,
    court_id: courtId,
    requested_date: '2026-08-30',
    requested_start: slot.start_time,
    requested_end: slot.end_time,
    customer_name: 'عميل محلي',
    customer_phone: '+201000000000',
    notes: 'ملاحظة',
    requested_recurring: false,
    original_slot_snapshot: slot,
    status: 'PENDING_SYNC' as const,
    created_at: '2026-08-30T12:00:00.000Z',
    resolved_booking_id: null,
    ...overrides,
  }
}

type LegacyBookingIntentStatus =
  | 'PENDING_RECHECK'
  | 'READY_TO_BOOK'
  | 'CONFLICT'
  | 'BOOKED'
  | 'DISMISSED'
  | 'EXPIRED'

function createLegacyIntent(
  localId: string,
  status: LegacyBookingIntentStatus,
  overrides: Record<string, unknown> = {},
) {
  return {
    scope_key: createOfflineScopeKey(userOneClubA),
    user_id: userOneClubA.userId,
    club_slug: userOneClubA.clubSlug,
    local_id: localId,
    court_id: 7,
    requested_date: '2026-08-30',
    requested_start: slot.start_time,
    requested_end: slot.end_time,
    customer_name: `عميل ${localId}`,
    customer_phone: '+201000000000',
    notes: null,
    original_slot_snapshot: {
      ...slot,
      can_start_recurring: true,
    },
    status,
    created_at: '2026-08-30T12:00:00.000Z',
    last_checked_at: '2026-08-30T13:00:00.000Z',
    resolved_booking_id: null,
    ...overrides,
  }
}

async function seedLegacyVersion2Database(
  databaseName: string,
  records: Array<Record<string, unknown>>,
): Promise<void> {
  const legacyDb = new Dexie(databaseName)

  legacyDb.version(1).stores({
    sync_metadata: '&scope_key, user_id, club_slug',
    schedule_days:
      '&[scope_key+court_id+date], scope_key, user_id, club_slug, [scope_key+court_id], [scope_key+date]',
    bookings:
      '&[scope_key+booking_id], scope_key, user_id, club_slug, [scope_key+start_time], [scope_key+status], [scope_key+court_id], [scope_key+customer_name], [scope_key+customer_phone]',
    booking_details: '&[scope_key+booking_id], scope_key, user_id, club_slug',
    transactions:
      '&[scope_key+transaction_id], scope_key, user_id, club_slug, [scope_key+created_at], [scope_key+payment_method], [scope_key+cancellation_state], [scope_key+settlement_state], [scope_key+collector_id], [scope_key+court_id]',
    transaction_details:
      '&[scope_key+transaction_id], scope_key, user_id, club_slug',
    booking_intents:
      '&[scope_key+local_id], scope_key, user_id, club_slug, [scope_key+court_id], [scope_key+status], [scope_key+created_at]',
    offline_context: '&scope_key, user_id, club_slug, last_verified_at',
  })
  legacyDb.version(2).stores({
    sync_metadata: '&scope_key, user_id, club_slug',
    schedule_days:
      '&[scope_key+court_id+date], scope_key, user_id, club_slug, [scope_key+court_id], [scope_key+date]',
    bookings:
      '&[scope_key+booking_id], scope_key, user_id, club_slug, [scope_key+start_time], [scope_key+status], [scope_key+court_id], [scope_key+customer_name], [scope_key+customer_phone]',
    booking_details: '&[scope_key+booking_id], scope_key, user_id, club_slug',
    transactions:
      '&[scope_key+transaction_id], scope_key, user_id, club_slug, [scope_key+created_at], [scope_key+payment_method], [scope_key+cancellation_state], [scope_key+settlement_state], [scope_key+collector_id], [scope_key+court_id]',
    transaction_details:
      '&[scope_key+transaction_id], scope_key, user_id, club_slug',
    current_custody_snapshots:
      '&[scope_key+snapshot_kind+collector_scope+court_scope], scope_key, user_id, club_slug, [scope_key+snapshot_kind], [scope_key+collector_scope], [scope_key+court_scope], synced_at',
    booking_intents:
      '&[scope_key+local_id], scope_key, user_id, club_slug, [scope_key+court_id], [scope_key+status], [scope_key+created_at]',
    offline_context: '&scope_key, user_id, club_slug, last_verified_at',
  })

  await legacyDb.open()
  await legacyDb.table('booking_intents').bulkPut(records)
  legacyDb.close()
}

describe('scoped offline repositories', () => {
  let db: SlotyLocalDatabase
  let repositories: ReturnType<typeof createOfflineRepositories>

  beforeEach(async () => {
    db = new SlotyLocalDatabase(`sloty-test-${crypto.randomUUID()}`)
    repositories = createOfflineRepositories(db)
    await db.open()
  })

  afterEach(async () => {
    db.close()
    await db.delete()
  })

  it('opens schema version 1 with all eight required stores', () => {
    expect(db.isOpen()).toBe(true)
    expect(db.verno).toBe(OFFLINE_SCHEMA_VERSION)
    expect(db.tables.map((table) => table.name).sort()).toEqual(
      [
        'sync_metadata',
        'schedule_days',
        'bookings',
        'booking_details',
        'transactions',
        'transaction_details',
        'current_custody_snapshots',
        'booking_intents',
        'offline_context',
      ].sort(),
    )
  })

  it('creates deterministic, user-and-Club-isolated scope keys', () => {
    expect(createOfflineScopeKey(userOneClubA)).toBe('user:1:club:club-a')
    expect(createOfflineScopeKey(userOneClubA)).toBe(
      createOfflineScopeKey({ userId: 1, clubSlug: ' club-a ' }),
    )
    expect(createOfflineScopeKey(userOneClubA)).not.toBe(
      createOfflineScopeKey(userOneClubB),
    )
    expect(createOfflineScopeKey(userOneClubA)).not.toBe(
      createOfflineScopeKey(userTwoClubA),
    )
  })

  it('stores operational freshness per user and Club scope and survives repository recreation', async () => {
    await repositories.markOperationalSyncComplete(
      userOneClubA,
      '2026-09-04T08:00:00.000Z',
    )
    await repositories.markOperationalSyncComplete(
      userOneClubB,
      '2026-09-04T06:00:00.000Z',
    )
    await repositories.markOperationalSyncComplete(
      userTwoClubA,
      '2026-09-04T03:00:00.000Z',
    )

    expect((await repositories.getSyncMetadata(userOneClubA))?.operational_last_sync_at)
      .toBe('2026-09-04T08:00:00.000Z')
    expect((await repositories.getSyncMetadata(userOneClubB))?.operational_last_sync_at)
      .toBe('2026-09-04T06:00:00.000Z')
    expect((await repositories.getSyncMetadata(userTwoClubA))?.operational_last_sync_at)
      .toBe('2026-09-04T03:00:00.000Z')

    db.close()
    repositories = createOfflineRepositories(db)
    await db.open()

    expect((await repositories.getSyncMetadata(userOneClubA))?.operational_last_sync_at)
      .toBe('2026-09-04T08:00:00.000Z')
  })

  it('saves and reads Schedule only for the exact scope, Court, and date', async () => {
    await repositories.replaceScheduleDay(
      userOneClubA,
      7,
      slot.date,
      [slot],
      '2026-08-30T12:00:00.000Z',
    )
    await repositories.replaceScheduleDay(
      userTwoClubA,
      7,
      slot.date,
      [{ ...slot, label: 'نطاق آخر' }],
      '2026-08-30T12:01:00.000Z',
    )

    expect(
      (await repositories.readScheduleDay(userOneClubA, 7, slot.date))
        ?.slots[0].label,
    ).toBe('متاح')
    expect(
      (await repositories.readScheduleDay(userTwoClubA, 7, slot.date))
        ?.slots[0].label,
    ).toBe('نطاق آخر')
    expect(
      await repositories.readScheduleDay(userOneClubB, 7, slot.date),
    ).toBeUndefined()
  })

  it('atomically replaces a bounded Schedule window with empty-day markers', async () => {
    await repositories.replaceScheduleDay(
      userOneClubA,
      7,
      '2026-08-29',
      [{ ...slot, date: '2026-08-29', label: 'خارج النافذة' }],
      '2026-08-30T08:00:00.000Z',
    )
    await repositories.replaceScheduleDay(
      userOneClubA,
      8,
      '2026-08-30',
      [{ ...slot, label: 'ملعب آخر' }],
      '2026-08-30T08:00:00.000Z',
    )

    await repositories.replaceScheduleWindow(
      userOneClubA,
      7,
      [
        {
          date: '2026-08-30',
          message: null,
          slots: [slot],
        },
        {
          date: '2026-08-31',
          message: 'الملعب مغلق في هذا اليوم.',
          slots: [],
        },
      ],
      '2026-08-30T12:00:00.000Z',
    )

    expect((await repositories.readScheduleDay(userOneClubA, 7, '2026-08-30'))?.slots[0])
      .toMatchObject({
        slot_status: 'FREE',
        slot_price: '200.00',
        can_start_recurring: true,
      })
    expect(await repositories.readScheduleDay(userOneClubA, 7, '2026-08-31'))
      .toMatchObject({
        message: 'الملعب مغلق في هذا اليوم.',
        slots: [],
        synced_at: '2026-08-30T12:00:00.000Z',
      })
    expect((await repositories.readScheduleDay(userOneClubA, 7, '2026-08-29'))?.slots[0].label)
      .toBe('خارج النافذة')
    expect((await repositories.readScheduleDay(userOneClubA, 8, '2026-08-30'))?.slots[0].label)
      .toBe('ملعب آخر')
    expect((await repositories.getSyncMetadata(userOneClubA))?.schedule_last_sync_at)
      .toBe('2026-08-30T12:00:00.000Z')
  })

  it('keeps the previous Schedule window and metadata when atomic persistence fails', async () => {
    await repositories.replaceScheduleWindow(
      userOneClubA,
      7,
      [
        {
          date: '2026-08-30',
          message: null,
          slots: [{ ...slot, label: 'قديم' }],
        },
      ],
      '2026-08-30T09:00:00.000Z',
    )
    const bulkPut = vi
      .spyOn(db.schedule_days, 'bulkPut')
      .mockRejectedValueOnce(new Error('simulated schedule write failure'))

    await expect(
      repositories.replaceScheduleWindow(
        userOneClubA,
        7,
        [
          {
            date: '2026-08-30',
            message: null,
            slots: [{ ...slot, label: 'جديد' }],
          },
        ],
        '2026-08-30T13:00:00.000Z',
      ),
    ).rejects.toThrow('simulated schedule write failure')

    expect((await repositories.readScheduleDay(userOneClubA, 7, '2026-08-30'))?.slots[0].label)
      .toBe('قديم')
    expect((await repositories.getSyncMetadata(userOneClubA))?.schedule_last_sync_at)
      .toBe('2026-08-30T09:00:00.000Z')
    bulkPut.mockRestore()
  })

  it('keeps Booking and Transaction snapshots isolated by user and Club', async () => {
    await repositories.replaceBookingsSnapshot(
      userOneClubA,
      [createBooking(1, 'نادي أ')],
      '2026-08-30T12:00:00.000Z',
    )
    await repositories.replaceBookingsSnapshot(
      userOneClubB,
      [createBooking(1, 'نادي ب')],
      '2026-08-30T12:00:00.000Z',
    )
    await repositories.replaceTransactionsSnapshot(
      userOneClubA,
      [createTransaction(1)],
      '2026-08-30T12:00:00.000Z',
    )
    await repositories.replaceTransactionsSnapshot(
      userTwoClubA,
      [{ ...createTransaction(1), amount: '900.00' }],
      '2026-08-30T12:00:00.000Z',
    )

    expect((await repositories.readCachedBookings(userOneClubA))[0].customer_name)
      .toBe('نادي أ')
    expect((await repositories.readCachedBookings(userOneClubB))[0].customer_name)
      .toBe('نادي ب')
    expect(await repositories.readCachedBookings(userTwoClubA)).toEqual([])
    expect((await repositories.readCachedTransactions(userOneClubA))[0].amount)
      .toBe('100.00')
    expect((await repositories.readCachedTransactions(userTwoClubA))[0].amount)
      .toBe('900.00')
  })

  it('requires an explicit Court for BookingIntent reads and isolates intents', async () => {
    await repositories.saveBookingIntent(userOneClubA, createIntent('intent-1'))
    await repositories.saveBookingIntent(userOneClubA, createIntent('intent-2', 8))
    await repositories.saveBookingIntent(userTwoClubA, createIntent('intent-1'))

    expect(await repositories.getBookingIntents(userOneClubA, 7)).toHaveLength(1)
    expect(await repositories.getBookingIntents(userOneClubA, 8)).toHaveLength(1)
    expect(await repositories.getBookingIntents(userOneClubB, 7)).toEqual([])
    expect(repositories.getBookingIntents.length).toBe(2)
    expect('getAllScheduleDays' in repositories).toBe(false)
    expect(BOOKING_REQUEST_STATUSES).toEqual([
      'PENDING_SYNC',
      'SYNCING',
      'BOOKED',
      'NEEDS_REVIEW',
      'DISMISSED',
      'EXPIRED',
    ])
  })

  it('updates BookingIntent state only inside the exact user and Club scope', async () => {
    await repositories.saveBookingIntent(userOneClubA, createIntent('intent-1'))
    await repositories.saveBookingIntent(userTwoClubA, createIntent('intent-1'))

    const updatedIntent = await repositories.updateBookingIntentStatus(
      userOneClubA,
      'intent-1',
      'BOOKED',
      {
        lastAttemptAt: '2026-08-30T13:00:00.000Z',
        resolvedBookingId: 55,
      },
    )

    expect(updatedIntent?.status).toBe('BOOKED')
    expect(updatedIntent?.resolved_booking_id).toBe(55)
    expect(
      (await repositories.getBookingIntent(userOneClubA, 'intent-1'))
        ?.last_attempt_at,
    ).toBe('2026-08-30T13:00:00.000Z')
    expect(
      (await repositories.getBookingIntent(userTwoClubA, 'intent-1'))?.status,
    ).toBe('PENDING_SYNC')
    expect(
      await repositories.updateBookingIntentStatus(
        userOneClubB,
        'intent-1',
        'DISMISSED',
      ),
    ).toBeUndefined()
  })

  it('selects only retryable Booking Requests for sync in deterministic requested-time order', async () => {
    await repositories.saveBookingIntent(
      userOneClubA,
      createIntent('future', 7, {
        requested_start: '2026-09-06T10:00:00',
        requested_end: '2026-09-06T11:00:00',
        status: 'PENDING_SYNC',
      }),
    )
    await repositories.saveBookingIntent(
      userOneClubA,
      createIntent('historical', 7, {
        requested_start: '2026-01-01T10:00:00',
        requested_end: '2026-01-01T11:00:00',
        status: 'PENDING_SYNC',
      }),
    )
    await repositories.saveBookingIntent(
      userOneClubA,
      createIntent('syncing', 7, {
        requested_start: '2026-01-02T10:00:00',
        requested_end: '2026-01-02T11:00:00',
        status: 'SYNCING',
      }),
    )
    await repositories.saveBookingIntent(
      userOneClubA,
      createIntent('review', 7, { status: 'NEEDS_REVIEW' }),
    )
    await repositories.saveBookingIntent(
      userOneClubA,
      createIntent('dismissed', 7, { status: 'DISMISSED' }),
    )
    await repositories.saveBookingIntent(
      userOneClubB,
      createIntent('other-club', 7, { status: 'PENDING_SYNC' }),
    )

    const requests = await repositories.getBookingRequestsForSync(
      userOneClubA,
      [7],
    )

    expect(requests.map((request) => request.local_id)).toEqual([
      'historical',
      'syncing',
      'future',
    ])
  })

  it('migrates legacy BookingIntent rows to canonical Booking Request records without losing unresolved work', async () => {
    const databaseName = `sloty-legacy-${crypto.randomUUID()}`
    await seedLegacyVersion2Database(databaseName, [
      createLegacyIntent('pending', 'PENDING_RECHECK'),
      createLegacyIntent('ready', 'READY_TO_BOOK'),
      createLegacyIntent('conflict', 'CONFLICT'),
      createLegacyIntent('expired-time', 'EXPIRED'),
      createLegacyIntent('booked', 'BOOKED', { resolved_booking_id: 55 }),
      createLegacyIntent('dismissed', 'DISMISSED'),
    ])

    const migratedDb = new SlotyLocalDatabase(databaseName)
    await migratedDb.open()
    const migratedRepositories = createOfflineRepositories(migratedDb)
    const migratedRequests =
      await migratedRepositories.getBookingIntents(userOneClubA, 7)
    const byLocalId = Object.fromEntries(
      migratedRequests.map((request) => [request.local_id, request]),
    )

    expect(migratedDb.verno).toBe(OFFLINE_SCHEMA_VERSION)
    expect(
      migratedRequests.filter((request) =>
        unresolvedBookingRequestStatuses.includes(request.status),
      ),
    ).toHaveLength(4)
    expect(byLocalId.pending.status).toBe('PENDING_SYNC')
    expect(byLocalId.ready.status).toBe('PENDING_SYNC')
    expect(byLocalId.conflict.status).toBe('NEEDS_REVIEW')
    expect(byLocalId.conflict.review_reason).toBe('SLOT_UNAVAILABLE')
    expect(byLocalId['expired-time'].status).toBe('PENDING_SYNC')
    expect(byLocalId.booked.status).toBe('BOOKED')
    expect(byLocalId.booked.resolved_booking_id).toBe(55)
    expect(byLocalId.dismissed.status).toBe('DISMISSED')
    expect(migratedRequests.every((request) => request.client_request_id))
      .toBe(true)
    expect(new Set(migratedRequests.map((request) => request.client_request_id)).size)
      .toBe(6)
    expect(migratedRequests.every((request) => request.requested_recurring === false))
      .toBe(true)
    expect(byLocalId.pending.created_at).toBe('2026-08-30T12:00:00.000Z')
    expect(byLocalId.pending.updated_at).toBe('2026-08-30T13:00:00.000Z')
    expect(byLocalId.pending.last_attempt_at).toBeNull()
    expect(byLocalId.pending.scope_key).toBe(createOfflineScopeKey(userOneClubA))
    expect('last_checked_at' in byLocalId.pending).toBe(false)

    migratedDb.close()
    await migratedDb.delete()
  })

  it('preserves existing client_request_id and explicit requested_recurring through migration and reopen', async () => {
    const databaseName = `sloty-legacy-${crypto.randomUUID()}`
    await seedLegacyVersion2Database(databaseName, [
      createLegacyIntent('existing-id', 'PENDING_RECHECK', {
        client_request_id: 'existing-client-request-id',
        requested_recurring: true,
      }),
    ])

    const firstOpen = new SlotyLocalDatabase(databaseName)
    await firstOpen.open()
    const firstRecord = await createOfflineRepositories(firstOpen)
      .getBookingIntent(userOneClubA, 'existing-id')
    firstOpen.close()

    const secondOpen = new SlotyLocalDatabase(databaseName)
    await secondOpen.open()
    const secondRecord = await createOfflineRepositories(secondOpen)
      .getBookingIntent(userOneClubA, 'existing-id')

    expect(firstRecord?.client_request_id).toBe('existing-client-request-id')
    expect(secondRecord?.client_request_id).toBe('existing-client-request-id')
    expect(secondRecord?.requested_recurring).toBe(true)

    secondOpen.close()
    await secondOpen.delete()
  })

  it('keeps partial Booking Request updates from changing idempotency, recurrence, or customer payload', async () => {
    await repositories.saveBookingIntent(userOneClubA, {
      ...createIntent('intent-stable'),
      client_request_id: 'stable-client-request-id',
      requested_recurring: true,
    })

    await repositories.updateBookingIntentStatus(
      userOneClubA,
      'intent-stable',
      'NEEDS_REVIEW',
      { reviewReason: 'SLOT_UNAVAILABLE' },
    )

    const updated = await repositories.getBookingIntent(
      userOneClubA,
      'intent-stable',
    )
    expect(updated?.client_request_id).toBe('stable-client-request-id')
    expect(updated?.requested_recurring).toBe(true)
    expect(updated?.customer_name).toBe('عميل محلي')
    expect(updated?.original_slot_snapshot).toEqual(slot)
    expect(updated?.review_reason).toBe('SLOT_UNAVAILABLE')
  })

  it('creates new offline requests as canonical Booking Request records and survives database reopen', async () => {
    await repositories.saveBookingIntent(userOneClubA, createIntent('intent-new'))
    const saved = await repositories.getBookingIntent(userOneClubA, 'intent-new')

    expect(saved?.status).toBe('PENDING_SYNC')
    expect(saved?.client_request_id).toMatch(/^booking-request-/)
    expect(saved?.requested_recurring).toBe(false)
    expect(saved?.review_reason).toBeNull()
    expect(saved?.updated_at).toBe(saved?.created_at)
    expect(saved?.last_attempt_at).toBeNull()

    const stableClientRequestId = saved?.client_request_id
    db.close()
    repositories = createOfflineRepositories(db)
    await db.open()

    const reopened = await repositories.getBookingIntent(userOneClubA, 'intent-new')
    expect(reopened?.local_id).toBe('intent-new')
    expect(reopened?.client_request_id).toBe(stableClientRequestId)
    expect(reopened?.customer_name).toBe('عميل محلي')
  })

  it('atomically replaces a complete Booking snapshot and preserves other scopes and datasets', async () => {
    await repositories.replaceBookingsSnapshot(
      userOneClubA,
      [createBooking(1), createBooking(2)],
      '2026-08-30T12:00:00.000Z',
    )
    await repositories.replaceBookingsSnapshot(
      userOneClubB,
      [createBooking(9)],
      '2026-08-30T12:00:00.000Z',
    )
    await repositories.replaceTransactionsSnapshot(
      userOneClubA,
      [createTransaction(3)],
      '2026-08-30T12:00:00.000Z',
    )

    await repositories.replaceBookingsSnapshot(
      userOneClubA,
      [createBooking(2), createBooking(3)],
      '2026-08-30T13:00:00.000Z',
    )

    expect((await repositories.readCachedBookings(userOneClubA)).map(({ id }) => id).sort())
      .toEqual([2, 3])
    expect((await repositories.readCachedBookings(userOneClubB)).map(({ id }) => id))
      .toEqual([9])
    expect(await repositories.readCachedTransactions(userOneClubA)).toHaveLength(1)
  })

  it('rolls back deletion and metadata when replacement writing fails', async () => {
    await repositories.replaceBookingsSnapshot(
      userOneClubA,
      [createBooking(1)],
      '2026-08-30T12:00:00.000Z',
    )
    const bulkPut = vi
      .spyOn(db.bookings, 'bulkPut')
      .mockRejectedValueOnce(new Error('simulated write failure'))

    await expect(
      repositories.replaceBookingsSnapshot(
        userOneClubA,
        [createBooking(2)],
        '2026-08-30T13:00:00.000Z',
      ),
    ).rejects.toThrow('simulated write failure')

    expect((await repositories.readCachedBookings(userOneClubA)).map(({ id }) => id))
      .toEqual([1])
    expect((await repositories.getSyncMetadata(userOneClubA))?.bookings_last_sync_at)
      .toBe('2026-08-30T12:00:00.000Z')
    bulkPut.mockRestore()
  })

  it('tracks independent successful dataset timestamps without inventing others', async () => {
    await repositories.replaceScheduleDay(
      userOneClubA,
      7,
      slot.date,
      [slot],
      '2026-08-30T12:00:00.000Z',
    )

    const afterSchedule = await repositories.getSyncMetadata(userOneClubA)
    expect(afterSchedule?.schedule_last_sync_at).toBe('2026-08-30T12:00:00.000Z')
    expect(afterSchedule?.bookings_last_sync_at).toBeUndefined()
    expect(afterSchedule?.transactions_last_sync_at).toBeUndefined()

    await repositories.replaceTransactionsSnapshot(
      userOneClubA,
      [createTransaction(1)],
      '2026-08-30T13:00:00.000Z',
    )
    const afterTransactions = await repositories.getSyncMetadata(userOneClubA)
    expect(afterTransactions?.schedule_last_sync_at).toBe('2026-08-30T12:00:00.000Z')
    expect(afterTransactions?.transactions_last_sync_at)
      .toBe('2026-08-30T13:00:00.000Z')
  })

  it('stores current-custody snapshots by scope, collector, and Court without reading transactions', async () => {
    const groupedPayload = {
      results: [
        {
          collected_by: 15,
          collected_by_name: 'محمد علي',
          transaction_count: 3,
          net_amount: '1250.00',
          totals_by_payment_method: {
            CASH: '500.00',
            DIGITAL_WALLET: '750.00',
          },
          period_start: '2026-07-01T10:00:00+03:00',
          period_end: '2026-09-03T10:00:00+03:00',
          total_amount: '1400.00',
          booking_payments: '1400.00',
          booking_refunds: '-150.00',
          is_self: false,
          can_approve: true,
        },
      ],
    }
    const courtPayload = {
      results: [
        {
          ...groupedPayload.results[0],
          net_amount: '900.00',
        },
      ],
    }

    await repositories.replaceTransactionsSnapshot(
      userOneClubA,
      [createTransaction(1)],
      '2026-08-30T11:00:00.000Z',
    )
    await repositories.replaceCurrentCustodySnapshot(
      userOneClubA,
      {
        kind: 'grouped_summary',
        collectorId: null,
        courtId: null,
        payload: groupedPayload,
      },
      '2026-08-30T12:00:00.000Z',
    )
    await repositories.replaceCurrentCustodySnapshot(
      userOneClubA,
      {
        kind: 'grouped_summary',
        collectorId: null,
        courtId: 7,
        payload: courtPayload,
      },
      '2026-08-30T12:05:00.000Z',
    )

    expect(
      (await repositories.readCurrentCustodySnapshot(
        userOneClubA,
        'grouped_summary',
        null,
        null,
      ))?.payload,
    ).toEqual(groupedPayload)
    expect(
      (await repositories.readCurrentCustodySnapshot(
        userOneClubA,
        'grouped_summary',
        null,
        7,
      ))?.payload,
    ).toEqual(courtPayload)
    expect(
      await repositories.readCurrentCustodySnapshot(
        userOneClubB,
        'grouped_summary',
        null,
        null,
      ),
    ).toBeUndefined()
    expect((await repositories.readCachedTransactions(userOneClubA))).toHaveLength(1)
  })

  it('preserves the previous current-custody snapshot and timestamp when replacement fails', async () => {
    const firstPayload = { results: [] }
    const nextPayload = {
      results: [
        {
          collected_by: 15,
          collected_by_name: 'محمد علي',
          transaction_count: 4,
          net_amount: '1450.00',
          totals_by_payment_method: {},
          period_start: '2026-07-01T10:00:00+03:00',
          period_end: '2026-09-03T10:00:00+03:00',
          total_amount: '1450.00',
          booking_payments: '1450.00',
          booking_refunds: '0.00',
          is_self: false,
          can_approve: true,
        },
      ],
    }

    await repositories.replaceCurrentCustodySnapshot(
      userOneClubA,
      {
        kind: 'grouped_summary',
        collectorId: null,
        courtId: null,
        payload: firstPayload,
      },
      '2026-08-30T12:00:00.000Z',
    )
    const put = vi
      .spyOn(db.current_custody_snapshots, 'put')
      .mockRejectedValueOnce(new Error('simulated custody write failure'))

    await expect(
      repositories.replaceCurrentCustodySnapshot(
        userOneClubA,
        {
          kind: 'grouped_summary',
          collectorId: null,
          courtId: null,
          payload: nextPayload,
        },
        '2026-08-30T13:00:00.000Z',
      ),
    ).rejects.toThrow('simulated custody write failure')

    expect(
      (await repositories.readCurrentCustodySnapshot(
        userOneClubA,
        'grouped_summary',
        null,
        null,
      ))?.payload,
    ).toEqual(firstPayload)
    expect(
      (await repositories.getSyncMetadata(userOneClubA))
        ?.current_custody_last_sync_at,
    ).toBe('2026-08-30T12:00:00.000Z')
    put.mockRestore()
  })

  it('stores separate scoped detail records without prefetching list rows', async () => {
    await repositories.saveBookingDetail(
      userOneClubA,
      createBooking(1),
      '2026-08-30T12:00:00.000Z',
    )
    await repositories.saveTransactionDetail(
      userOneClubA,
      createTransaction(1),
      '2026-08-30T12:00:00.000Z',
    )

    expect((await repositories.readBookingDetail(userOneClubA, 1))?.id).toBe(1)
    expect(await repositories.readBookingDetail(userOneClubB, 1)).toBeUndefined()
    expect((await repositories.readTransactionDetail(userOneClubA, 1))?.id)
      .toBe(1)
    expect(await repositories.readCachedBookings(userOneClubA)).toEqual([])
  })

  it('stores only minimal Backend-verified operational context per Club', async () => {
    clearAuthTokens()
    await repositories.saveOfflineContext({
      scope: userOneClubA,
      displayName: 'أحمد علي',
      isPlatformAdmin: false,
      membership: {
        id: 10,
        role: 'STAFF',
        club: {
          id: 1,
          slug: 'club-a',
          name: 'Club A',
          is_active: true,
        },
        court: { id: 7, name: 'ملعب 1' },
      },
      lastVerifiedAt: '2026-08-30T12:00:00.000Z',
    })

    const context = await repositories.readOfflineContext(userOneClubA)
    expect(context).toMatchObject({
      user_id: 1,
      selected_club_slug: 'club-a',
      membership_id: 10,
      role: 'STAFF',
      assigned_court_id: 7,
      schema_version: OFFLINE_SCHEMA_VERSION,
    })
    expect(context).not.toHaveProperty('password')
    expect(context).not.toHaveProperty('access_token')
    expect(context).not.toHaveProperty('refresh_token')
    expect(context).not.toHaveProperty('permissions')
    expect(await repositories.readOfflineContext(userOneClubB)).toBeUndefined()
    expect(getAccessToken()).toBeNull()
  })

  it('updates the selected Club context without deleting another isolated Club cache', async () => {
    const membership = {
      id: 10,
      role: 'MANAGER' as const,
      club: { id: 1, slug: 'club-a', name: 'Club A', is_active: true },
      court: null,
    }
    await repositories.saveOfflineContext({
      scope: userOneClubA,
      displayName: 'مدير',
      isPlatformAdmin: false,
      membership,
      lastVerifiedAt: '2026-08-30T12:00:00.000Z',
    })
    await repositories.saveOfflineContext({
      scope: userOneClubB,
      displayName: 'مدير',
      isPlatformAdmin: false,
      membership: {
        ...membership,
        id: 11,
        club: { ...membership.club, id: 2, slug: 'club-b', name: 'Club B' },
      },
      lastVerifiedAt: '2026-08-30T13:00:00.000Z',
    })

    expect(await repositories.readOfflineContext(userOneClubA)).toBeDefined()
    expect((await repositories.readOfflineContext(userOneClubB))?.membership_id)
      .toBe(11)
  })

  it('reads the latest verified context for a selected Club without crossing Club scope', async () => {
    const membership = {
      id: 10,
      role: 'STAFF' as const,
      club: { id: 1, slug: 'club-a', name: 'Club A', is_active: true },
      court: { id: 7, name: 'ملعب 1' },
    }
    await repositories.saveOfflineContext({
      scope: userOneClubA,
      displayName: 'قديم',
      isPlatformAdmin: false,
      membership,
      lastVerifiedAt: '2026-09-04T08:00:00.000Z',
    })
    await repositories.saveOfflineContext({
      scope: userTwoClubA,
      displayName: 'أحدث',
      isPlatformAdmin: false,
      membership: {
        ...membership,
        id: 20,
      },
      lastVerifiedAt: '2026-09-04T09:00:00.000Z',
    })
    await repositories.saveOfflineContext({
      scope: userOneClubB,
      displayName: 'نادي آخر',
      isPlatformAdmin: false,
      membership: {
        ...membership,
        id: 30,
        club: { id: 2, slug: 'club-b', name: 'Club B', is_active: true },
      },
      lastVerifiedAt: '2026-09-04T10:00:00.000Z',
    })

    expect(
      await repositories.readLatestOfflineContextForClub('club-a'),
    ).toMatchObject({
      user_id: 2,
      club_slug: 'club-a',
      display_name: 'أحدث',
      membership_id: 20,
    })
    expect(
      await repositories.readLatestOfflineContextForClub('club-b'),
    ).toMatchObject({
      user_id: 1,
      club_slug: 'club-b',
      membership_id: 30,
    })
  })

  it('keeps Platform Admin operational context Club-scoped', async () => {
    const membership = {
      id: 20,
      role: 'OWNER' as const,
      club: { id: 1, slug: 'club-a', name: 'Club A', is_active: true },
      court: null,
    }
    await repositories.saveOfflineContext({
      scope: userOneClubA,
      displayName: 'مسؤول المنصة',
      isPlatformAdmin: true,
      membership,
      lastVerifiedAt: '2026-08-30T12:00:00.000Z',
    })

    expect((await repositories.readOfflineContext(userOneClubA))?.is_platform_admin)
      .toBe(true)
    expect(await repositories.readOfflineContext(userOneClubB)).toBeUndefined()
  })

  it('clearScope removes all of one Club scope and preserves the same user other Club', async () => {
    for (const scope of [userOneClubA, userOneClubB]) {
      await repositories.replaceScheduleDay(
        scope,
        7,
        slot.date,
        [slot],
        '2026-08-30T12:00:00.000Z',
      )
      await repositories.replaceBookingsSnapshot(
        scope,
        [createBooking(1)],
        '2026-08-30T12:00:00.000Z',
      )
      await repositories.replaceTransactionsSnapshot(
        scope,
        [createTransaction(1)],
        '2026-08-30T12:00:00.000Z',
      )
      await repositories.saveBookingDetail(scope, createBooking(1), 'cached')
      await repositories.saveTransactionDetail(scope, createTransaction(1), 'cached')
      await repositories.saveBookingIntent(scope, createIntent('intent-1'))
      await repositories.saveOfflineContext({
        scope,
        displayName: 'مستخدم',
        isPlatformAdmin: false,
        membership: {
          id: 10,
          role: 'STAFF',
          club: {
            id: 1,
            slug: scope.clubSlug,
            name: 'Club',
            is_active: true,
          },
          court: { id: 7, name: 'ملعب 1' },
        },
        lastVerifiedAt: '2026-08-30T12:00:00.000Z',
      })
    }

    await repositories.clearScope(userOneClubA)

    expect(await repositories.readScheduleDay(userOneClubA, 7, slot.date))
      .toBeUndefined()
    expect(await repositories.readCachedBookings(userOneClubA)).toEqual([])
    expect(await repositories.readCachedTransactions(userOneClubA)).toEqual([])
    expect(await repositories.readBookingDetail(userOneClubA, 1)).toBeUndefined()
    expect(await repositories.readTransactionDetail(userOneClubA, 1)).toBeUndefined()
    expect(await repositories.getBookingIntents(userOneClubA, 7)).toEqual([])
    expect(await repositories.getSyncMetadata(userOneClubA)).toBeUndefined()
    expect(await repositories.readOfflineContext(userOneClubA)).toBeUndefined()
    expect(await repositories.readCachedBookings(userOneClubB)).toHaveLength(1)
    expect(await repositories.readOfflineContext(userOneClubB)).toBeDefined()
  })

  it('clearUserOperationalData removes every owned scope and preserves other users', async () => {
    for (const scope of [userOneClubA, userOneClubB, userTwoClubA]) {
      await repositories.replaceBookingsSnapshot(
        scope,
        [createBooking(1)],
        '2026-08-30T12:00:00.000Z',
      )
      await repositories.saveBookingIntent(scope, createIntent('intent-1'))
      await repositories.saveBookingDetail(scope, createBooking(1), 'cached')
      await repositories.saveTransactionDetail(scope, createTransaction(1), 'cached')
    }

    await repositories.clearUserOperationalData(1)

    expect(await repositories.readCachedBookings(userOneClubA)).toEqual([])
    expect(await repositories.readCachedBookings(userOneClubB)).toEqual([])
    expect(await repositories.getBookingIntents(userOneClubA, 7)).toEqual([])
    expect(await repositories.readBookingDetail(userOneClubA, 1)).toBeUndefined()
    expect(await repositories.readTransactionDetail(userOneClubB, 1)).toBeUndefined()
    expect(await repositories.getSyncMetadata(userOneClubA)).toBeUndefined()
    expect(await repositories.readCachedBookings(userTwoClubA)).toHaveLength(1)
    expect(await repositories.getBookingIntents(userTwoClubA, 7)).toHaveLength(1)
    expect(await repositories.readBookingDetail(userTwoClubA, 1)).toBeDefined()
  })
})
