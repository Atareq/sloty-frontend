import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CurrentUserMembership } from '../../core/auth/auth.types'
import type { Booking } from '../../features/bookings/bookings.types'
import type { BookingSlot } from '../../features/schedule/scheduleApi.types'
import type { Transaction } from '../../features/transactions/transactions.types'
import { SlotyLocalDatabase } from '../db/SlotyLocalDatabase'
import { createOfflineRepositories } from '../repositories/offlineRepositories'
import { createOfflineScopeKey } from '../scope/offlineScope'
import type {
  DatasetSyncTask,
  DatasetSyncTaskResult,
  OperationalSyncContext,
  SyncDataset,
} from './sync.types'
import { OfflineSyncCoordinator } from './syncCoordinator'
import type { BookingRequestQueueResult } from '../bookings/bookingRequestSync'

interface Deferred<TValue> {
  promise: Promise<TValue>
  reject: (reason?: unknown) => void
  resolve: (value: TValue | PromiseLike<TValue>) => void
}

function createDeferred<TValue>(): Deferred<TValue> {
  let resolve!: Deferred<TValue>['resolve']
  let reject!: Deferred<TValue>['reject']
  const promise = new Promise<TValue>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })

  return { promise, reject, resolve }
}

function createResult(
  dataset: SyncDataset,
  status: DatasetSyncTaskResult['status'] = 'success',
): DatasetSyncTaskResult {
  return {
    dataset,
    status,
    committedAt:
      status === 'success' ? '2026-08-30T12:00:00.000Z' : undefined,
  }
}

function createTask(
  dataset: SyncDataset,
  run: DatasetSyncTask['run'],
): DatasetSyncTask {
  return { dataset, run }
}

function createCurrentCustodyTask(
  run: DatasetSyncTask['run'] = async () => createResult('current_custody'),
): DatasetSyncTask {
  return createTask('current_custody', run)
}

function createBookingRequestResult(
  overrides: Partial<BookingRequestQueueResult> = {},
): BookingRequestQueueResult {
  return {
    processed: 0,
    booked: 0,
    needsReview: 0,
    pendingRetry: 0,
    skipped: 0,
    integrityMismatch: 0,
    unknownNonretryable: 0,
    stopped: false,
    stopReason: null,
    results: [],
    ...overrides,
  }
}

const membership: CurrentUserMembership = {
  id: 10,
  role: 'STAFF',
  club: {
    id: 1,
    slug: 'club-a',
    name: 'Club A',
    is_active: true,
  },
  court: { id: 7, name: 'Court 7' },
}

function createContext(
  userId: number,
  clubSlug: string,
  nextMembership: CurrentUserMembership = membership,
): OperationalSyncContext {
  const scope = { userId, clubSlug }

  return {
    ...scope,
    scopeKey: createOfflineScopeKey(scope),
    role: nextMembership.role,
    membership: nextMembership,
    membershipId: nextMembership.id,
    assignedCourtId: nextMembership.court?.id ?? null,
    assignedCourtName: nextMembership.court?.name ?? null,
  }
}

const contextA = createContext(1, 'club-a')
const contextB = createContext(2, 'club-a')

describe('OfflineSyncCoordinator', () => {
  it('runs Booking Requests first, then starts Schedule and later refresh datasets', async () => {
    const scheduleGate = createDeferred<DatasetSyncTaskResult>()
    const calls: string[] = []
    const coordinator = new OfflineSyncCoordinator({
      processBookingRequests: vi.fn(async () => {
        calls.push('booking-requests')
        return createBookingRequestResult()
      }),
      tasks: [
        createTask('schedule', async () => {
          calls.push('schedule:start')
          const result = await scheduleGate.promise
          calls.push('schedule:end')
          return result
        }),
        createTask('bookings', async () => {
          calls.push('bookings:start')
          return createResult('bookings')
        }),
        createTask('transactions', async () => {
          calls.push('transactions:start')
          return createResult('transactions')
        }),
        createCurrentCustodyTask(async () => {
          calls.push('current_custody:start')
          return createResult('current_custody')
        }),
      ],
    })

    const run = coordinator.requestSync({
      context: contextA,
      trigger: 'startup',
    })
    await Promise.resolve()
    await Promise.resolve()

    expect(calls).toEqual(['booking-requests', 'schedule:start'])

    scheduleGate.resolve(createResult('schedule'))
    const result = await run

    expect(calls).toEqual([
      'booking-requests',
      'schedule:start',
      'schedule:end',
      'bookings:start',
      'transactions:start',
      'current_custody:start',
    ])
    expect(result.status).toBe('success')
  })

  it('processes Booking Requests before Schedule persistence and secondary datasets', async () => {
    const calls: string[] = []
    const intentRecheck = vi.fn(async () => {
      calls.push('intent-recheck')
    })
    const processBookingRequests = vi.fn(async () => {
      calls.push('booking-requests')
      return createBookingRequestResult({ processed: 1, booked: 1 })
    })
    const coordinator = new OfflineSyncCoordinator({
      processBookingRequests,
      recheckBookingIntents: intentRecheck,
      tasks: [
        createTask('schedule', async () => {
          calls.push('schedule')
          return {
            ...createResult('schedule'),
            metadata: { successfulCourtIds: [7], failedCourtIds: [] },
          }
        }),
        createTask('bookings', async () => {
          calls.push('bookings')
          return createResult('bookings')
        }),
        createTask('transactions', async () => {
          calls.push('transactions')
          return createResult('transactions')
        }),
        createCurrentCustodyTask(async () => {
          calls.push('current_custody')
          return createResult('current_custody')
        }),
      ],
    })

    const result = await coordinator.requestSync({
      context: contextA,
      trigger: 'online',
    })

    expect(calls).toEqual([
      'booking-requests',
      'schedule',
      'intent-recheck',
      'bookings',
      'transactions',
      'current_custody',
    ])
    expect(intentRecheck).toHaveBeenCalledWith(
      contextA,
      expect.objectContaining({
        dataset: 'schedule',
        metadata: { successfulCourtIds: [7], failedCourtIds: [] },
        status: 'success',
      }),
    )
    expect(processBookingRequests).toHaveBeenCalledWith(
      contextA,
      expect.any(AbortSignal),
    )
    expect(result.bookingRequests).toEqual(
      expect.objectContaining({ processed: 1, booked: 1 }),
    )
  })

  it('processes Booking Requests first but does not recheck BookingIntents when Schedule sync fails', async () => {
    const intentRecheck = vi.fn()
    const processBookingRequests = vi.fn()
    const coordinator = new OfflineSyncCoordinator({
      processBookingRequests,
      recheckBookingIntents: intentRecheck,
      tasks: [
        createTask('schedule', async () => {
          throw new Error('schedule failed before commit')
        }),
        createTask('bookings', async () => createResult('bookings')),
        createTask('transactions', async () => createResult('transactions')),
        createCurrentCustodyTask(),
      ],
    })

    const result = await coordinator.requestSync({
      context: contextA,
      trigger: 'online',
    })

    expect(result.datasets.schedule.status).toBe('failed')
    expect(intentRecheck).not.toHaveBeenCalled()
    expect(processBookingRequests).toHaveBeenCalledOnce()
  })

  it('skips secondary datasets when Booking Request processing stops for auth or access recovery', async () => {
    const calls: string[] = []
    const coordinator = new OfflineSyncCoordinator({
      processBookingRequests: vi.fn(async () => {
        calls.push('booking-requests')
        return createBookingRequestResult({
          processed: 1,
          stopped: true,
          stopReason: 'auth_required',
        })
      }),
      tasks: [
        createTask('schedule', async () => {
          calls.push('schedule')
          return {
            ...createResult('schedule'),
            metadata: { successfulCourtIds: [7], failedCourtIds: [] },
          }
        }),
        createTask('bookings', async () => {
          calls.push('bookings')
          return createResult('bookings')
        }),
        createTask('transactions', async () => {
          calls.push('transactions')
          return createResult('transactions')
        }),
        createCurrentCustodyTask(async () => {
          calls.push('current_custody')
          return createResult('current_custody')
        }),
      ],
    })

    const result = await coordinator.requestSync({
      context: contextA,
      trigger: 'online',
    })

    expect(calls).toEqual(['booking-requests'])
    expect(result.status).toBe('partial_failure')
    expect(result.datasets.schedule.status).toBe('skipped')
    expect(result.datasets.bookings.status).toBe('skipped')
    expect(result.datasets.transactions.status).toBe('skipped')
    expect(result.datasets.current_custody.status).toBe('skipped')
    expect(result.bookingRequests?.stopReason).toBe('auth_required')
  })

  it('keeps dataset failures independent after Schedule receives priority', async () => {
    const calls: string[] = []
    const coordinator = new OfflineSyncCoordinator({
      tasks: [
        createTask('schedule', async () => {
          calls.push('schedule')
          return createResult('schedule')
        }),
        createTask('bookings', async () => {
          calls.push('bookings')
          throw new Error('bookings endpoint failed')
        }),
        createTask('transactions', async () => {
          calls.push('transactions')
          return createResult('transactions')
        }),
        createCurrentCustodyTask(async () => {
          calls.push('current_custody')
          return createResult('current_custody')
        }),
      ],
    })

    const result = await coordinator.requestSync({
      context: contextA,
      trigger: 'online',
    })

    expect(calls).toEqual([
      'schedule',
      'bookings',
      'transactions',
      'current_custody',
    ])
    expect(result.status).toBe('partial_failure')
    expect(result.datasets.schedule.status).toBe('success')
    expect(result.datasets.bookings.status).toBe('failed')
    expect(result.datasets.transactions.status).toBe('success')
  })

  it('still attempts Bookings and Transactions when Schedule fails', async () => {
    const calls: string[] = []
    const coordinator = new OfflineSyncCoordinator({
      tasks: [
        createTask('schedule', async () => {
          calls.push('schedule')
          throw new Error('schedule endpoint failed')
        }),
        createTask('bookings', async () => {
          calls.push('bookings')
          return createResult('bookings')
        }),
        createTask('transactions', async () => {
          calls.push('transactions')
          return createResult('transactions')
        }),
        createCurrentCustodyTask(async () => {
          calls.push('current_custody')
          return createResult('current_custody')
        }),
      ],
    })

    const result = await coordinator.requestSync({
      context: contextA,
      trigger: 'resume',
    })

    expect(calls).toEqual([
      'schedule',
      'bookings',
      'transactions',
      'current_custody',
    ])
    expect(result.status).toBe('partial_failure')
    expect(result.datasets.schedule.status).toBe('failed')
    expect(result.datasets.bookings.status).toBe('success')
    expect(result.datasets.transactions.status).toBe('success')
  })

  it('coalesces startup, online, resume, and manual triggers into one same-scope run while active', async () => {
    const scheduleGate = createDeferred<DatasetSyncTaskResult>()
    const scheduleRun = vi.fn(async () => scheduleGate.promise)
    const bookingsRun = vi.fn(async () => createResult('bookings'))
    const transactionsRun = vi.fn(async () => createResult('transactions'))
    const currentCustodyRun = vi.fn(async () => createResult('current_custody'))
    const coordinator = new OfflineSyncCoordinator({
      processBookingRequests: vi.fn(async () => createBookingRequestResult()),
      tasks: [
        createTask('schedule', scheduleRun),
        createTask('bookings', bookingsRun),
        createTask('transactions', transactionsRun),
        createTask('current_custody', currentCustodyRun),
      ],
    })

    const startup = coordinator.requestSync({
      context: contextA,
      trigger: 'startup',
    })
    const online = coordinator.requestSync({
      context: contextA,
      trigger: 'online',
    })
    const resume = coordinator.requestSync({
      context: contextA,
      trigger: 'resume',
    })
    const manual = coordinator.requestSync({
      context: contextA,
      trigger: 'manual',
      force: true,
    })
    await Promise.resolve()

    expect(online).toBe(startup)
    expect(resume).toBe(startup)
    expect(manual).toBe(startup)
    await Promise.resolve()
    expect(scheduleRun).toHaveBeenCalledTimes(1)

    scheduleGate.resolve(createResult('schedule'))
    await startup

    expect(bookingsRun).toHaveBeenCalledTimes(1)
    expect(transactionsRun).toHaveBeenCalledTimes(1)
    expect(currentCustodyRun).toHaveBeenCalledTimes(1)
  })

  it('allows a future legitimate trigger after the previous same-scope run finishes', async () => {
    const scheduleRun = vi.fn(async () => createResult('schedule'))
    const coordinator = new OfflineSyncCoordinator({
      tasks: [
        createTask('schedule', scheduleRun),
        createTask('bookings', async () => createResult('bookings')),
        createTask('transactions', async () => createResult('transactions')),
        createCurrentCustodyTask(),
      ],
    })

    await coordinator.requestSync({ context: contextA, trigger: 'startup' })
    await coordinator.requestSync({ context: contextA, trigger: 'manual' })

    expect(scheduleRun).toHaveBeenCalledTimes(2)
  })

  it('records operational freshness only after a fully successful sync cycle', async () => {
    const recordOperationalSyncCompleted = vi.fn()
    const coordinator = new OfflineSyncCoordinator({
      getNow: () => new Date('2026-09-04T12:00:00.000Z'),
      recordOperationalSyncCompleted,
      tasks: [
        createTask('schedule', async () => createResult('schedule')),
        createTask('bookings', async () => createResult('bookings')),
        createTask('transactions', async () => createResult('transactions')),
        createCurrentCustodyTask(),
      ],
    })

    const result = await coordinator.requestSync({
      context: contextA,
      trigger: 'manual',
    })

    expect(result.status).toBe('success')
    expect(recordOperationalSyncCompleted).toHaveBeenCalledWith(
      contextA,
      '2026-09-04T12:00:00.000Z',
    )
  })

  it('does not advance operational freshness after a partial sync failure', async () => {
    const recordOperationalSyncCompleted = vi.fn()
    const coordinator = new OfflineSyncCoordinator({
      recordOperationalSyncCompleted,
      tasks: [
        createTask('schedule', async () => createResult('schedule')),
        createTask('bookings', async () => {
          throw new Error('bookings failed')
        }),
        createTask('transactions', async () => createResult('transactions')),
        createCurrentCustodyTask(),
      ],
    })

    const result = await coordinator.requestSync({
      context: contextA,
      trigger: 'manual',
    })

    expect(result.status).toBe('partial_failure')
    expect(recordOperationalSyncCompleted).not.toHaveBeenCalled()
  })

  it('keeps scope-specific tasks and visible status isolated across user and Club changes', async () => {
    const scopeARelease = createDeferred<DatasetSyncTaskResult>()
    const scopeBRelease = createDeferred<DatasetSyncTaskResult>()
    const coordinator = new OfflineSyncCoordinator({
      tasks: [
        createTask('schedule', async ({ operationalContext }) => {
          if (operationalContext.scopeKey === contextA.scopeKey) {
            return scopeARelease.promise
          }

          return scopeBRelease.promise
        }),
        createTask('bookings', async () => createResult('bookings')),
        createTask('transactions', async () => createResult('transactions')),
        createCurrentCustodyTask(),
      ],
    })

    coordinator.setActiveOwnerScope(contextA.scopeKey)
    const runA = coordinator.requestSync({
      context: contextA,
      trigger: 'startup',
    })
    await Promise.resolve()
    coordinator.setActiveOwnerScope(contextB.scopeKey)
    coordinator.cancelScope(contextA.scopeKey)
    const runB = coordinator.requestSync({
      context: contextB,
      trigger: 'startup',
    })

    scopeBRelease.resolve(createResult('schedule'))
    await runB
    expect(coordinator.getSnapshot().activeScopeKey).toBe(contextB.scopeKey)

    scopeARelease.resolve(createResult('schedule'))
    await runA
    expect(coordinator.getSnapshot().activeScopeKey).toBe(contextB.scopeKey)
  })
})

describe('OfflineSyncCoordinator repository integration', () => {
  let db: SlotyLocalDatabase
  let repositories: ReturnType<typeof createOfflineRepositories>

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

  const booking: Booking = {
    id: 1,
    court: 7,
    customer_name: 'عميل محفوظ',
    customer_phone: '+201000000000',
    start_time: '2026-08-30T18:00:00+03:00',
    end_time: '2026-08-30T19:00:00+03:00',
    status: 'CONFIRMED',
    is_recurring: false,
    recurrence_status: null,
    previous_recurring_booking_id: null,
    next_recurring_booking_id: null,
  }

  const transaction: Transaction = {
    id: 1,
    booking: 1,
    amount: '100.00',
    payment_method: 'CASH',
    created: '2026-08-30T18:05:00+03:00',
    court: 7,
    created_by: 15,
    is_cancelled: false,
    is_settled: false,
  }

  beforeEach(async () => {
    db = new SlotyLocalDatabase(`sloty-sync-test-${crypto.randomUUID()}`)
    repositories = createOfflineRepositories(db)
    await db.open()
  })

  afterEach(async () => {
    db.close()
    await db.delete()
  })

  it('advances only successful dataset metadata and preserves failed dataset cache', async () => {
    await repositories.replaceScheduleDay(
      contextA,
      7,
      slot.date,
      [{ ...slot, label: 'قديم' }],
      '2026-08-30T09:00:00.000Z',
    )
    await repositories.replaceBookingsSnapshot(
      contextA,
      [booking],
      '2026-08-30T09:01:00.000Z',
    )
    await repositories.replaceTransactionsSnapshot(
      contextA,
      [transaction],
      '2026-08-30T09:02:00.000Z',
    )
    const coordinator = new OfflineSyncCoordinator({
      tasks: [
        createTask('schedule', async () => {
          await repositories.replaceScheduleDay(
            contextA,
            7,
            slot.date,
            [{ ...slot, label: 'جديد' }],
            '2026-08-30T12:00:00.000Z',
          )
          return createResult('schedule')
        }),
        createTask('bookings', async () => {
          throw new Error('bookings failed before commit')
        }),
        createTask('transactions', async () => {
          await repositories.replaceTransactionsSnapshot(
            contextA,
            [{ ...transaction, id: 2 }],
            '2026-08-30T12:02:00.000Z',
          )
          return createResult('transactions')
        }),
        createCurrentCustodyTask(),
      ],
    })

    const result = await coordinator.requestSync({
      context: contextA,
      trigger: 'manual',
    })

    expect(result.status).toBe('partial_failure')
    expect(
      (await repositories.readScheduleDay(contextA, 7, slot.date))?.slots[0]
        .label,
    ).toBe('جديد')
    expect((await repositories.readCachedBookings(contextA))[0].id).toBe(1)
    expect((await repositories.readCachedTransactions(contextA))[0].id).toBe(2)

    const metadata = await repositories.getSyncMetadata(contextA)
    expect(metadata?.schedule_last_sync_at).toBe('2026-08-30T12:00:00.000Z')
    expect(metadata?.bookings_last_sync_at).toBe('2026-08-30T09:01:00.000Z')
    expect(metadata?.transactions_last_sync_at).toBe(
      '2026-08-30T12:02:00.000Z',
    )
    expect(await repositories.getSyncMetadata(contextB)).toBeUndefined()
  })
})
