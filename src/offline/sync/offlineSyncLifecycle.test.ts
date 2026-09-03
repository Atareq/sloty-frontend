import { afterEach, describe, expect, it, vi } from 'vitest'
import { BrowserConnectivityMonitor } from '../connectivity/browserConnectivity'
import { createOfflineScopeKey } from '../scope/offlineScope'
import type {
  DatasetSyncTask,
  DatasetSyncTaskResult,
  OperationalSyncContext,
  SyncDataset,
} from './sync.types'
import { OfflineSyncCoordinator } from './syncCoordinator'
import { OfflineSyncLifecycle } from './offlineSyncLifecycle'

interface Deferred<TValue> {
  promise: Promise<TValue>
  resolve: (value: TValue | PromiseLike<TValue>) => void
}

function createDeferred<TValue>(): Deferred<TValue> {
  let resolve!: Deferred<TValue>['resolve']
  const promise = new Promise<TValue>((resolvePromise) => {
    resolve = resolvePromise
  })

  return { promise, resolve }
}

function createResult(dataset: SyncDataset): DatasetSyncTaskResult {
  return {
    dataset,
    status: 'success',
    committedAt: '2026-08-30T12:00:00.000Z',
  }
}

function createTask(
  dataset: SyncDataset,
  run: DatasetSyncTask['run'],
): DatasetSyncTask {
  return { dataset, run }
}

const context: OperationalSyncContext = {
  userId: 1,
  clubSlug: 'club-a',
  scopeKey: createOfflineScopeKey({ userId: 1, clubSlug: 'club-a' }),
  role: 'STAFF',
  membership: {
    id: 10,
    role: 'STAFF',
    club: {
      id: 1,
      slug: 'club-a',
      name: 'Club A',
      is_active: true,
    },
    court: { id: 7, name: 'Court 7' },
  },
  membershipId: 10,
  assignedCourtId: 7,
  assignedCourtName: 'Court 7',
}

function createCoordinatorWithTasks(
  tasks: DatasetSyncTask[],
): OfflineSyncCoordinator {
  const includesCurrentCustody = tasks.some(
    (task) => task.dataset === 'current_custody',
  )

  return new OfflineSyncCoordinator({
    tasks: includesCurrentCustody
      ? tasks
      : [
          ...tasks,
          createTask('current_custody', async () => ({
            dataset: 'current_custody',
            status: 'skipped',
            reason: 'not_relevant_to_lifecycle_test',
          })),
        ],
  })
}

function setVisibilityState(value: DocumentVisibilityState): void {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    value,
  })
}

describe('OfflineSyncLifecycle', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    setVisibilityState('visible')
  })

  it('does not start dataset work before operational scope resolves', async () => {
    let currentContext: OperationalSyncContext | null = null
    const scheduleRun = vi.fn(async () => createResult('schedule'))
    const lifecycle = new OfflineSyncLifecycle({
      getContext: () => currentContext,
      coordinator: createCoordinatorWithTasks([
        createTask('schedule', scheduleRun),
        createTask('bookings', async () => createResult('bookings')),
        createTask('transactions', async () => createResult('transactions')),
      ]),
      connectivity: new BrowserConnectivityMonitor({ windowRef: window }),
      documentRef: document,
      windowRef: window,
    })

    lifecycle.start()
    await Promise.resolve()

    expect(scheduleRun).not.toHaveBeenCalled()

    currentContext = context
    lifecycle.updateContext()
    await Promise.resolve()

    expect(scheduleRun).toHaveBeenCalledTimes(1)
    lifecycle.stop()
  })

  it('coalesces startup, online, and visible-resume triggers into one active sync cycle', async () => {
    const scheduleGate = createDeferred<DatasetSyncTaskResult>()
    const scheduleRun = vi.fn(async () => scheduleGate.promise)
    const coordinator = createCoordinatorWithTasks([
      createTask('schedule', scheduleRun),
      createTask('bookings', async () => createResult('bookings')),
      createTask('transactions', async () => createResult('transactions')),
    ])
    const connectivity = new BrowserConnectivityMonitor({ windowRef: window })
    const lifecycle = new OfflineSyncLifecycle({
      getContext: () => context,
      coordinator,
      connectivity,
      config: { resumeMinAgeMs: 120000, failedRetryDelayMs: 30000 },
      documentRef: document,
      windowRef: window,
    })

    lifecycle.start()
    window.dispatchEvent(new Event('online'))
    setVisibilityState('hidden')
    document.dispatchEvent(new Event('visibilitychange'))
    setVisibilityState('visible')
    document.dispatchEvent(new Event('visibilitychange'))
    await Promise.resolve()

    expect(scheduleRun).toHaveBeenCalledTimes(1)

    scheduleGate.resolve(createResult('schedule'))
    await Promise.resolve()
    await Promise.resolve()
    lifecycle.stop()
  })

  it('does not resume-sync again before the freshness threshold has elapsed', async () => {
    let now = 1000
    const scheduleRun = vi.fn(async () => createResult('schedule'))
    const coordinator = createCoordinatorWithTasks([
      createTask('schedule', scheduleRun),
      createTask('bookings', async () => createResult('bookings')),
      createTask('transactions', async () => createResult('transactions')),
    ])
    const lifecycle = new OfflineSyncLifecycle({
      getContext: () => context,
      coordinator,
      connectivity: new BrowserConnectivityMonitor({ windowRef: window }),
      config: { resumeMinAgeMs: 120000, failedRetryDelayMs: 30000 },
      documentRef: document,
      windowRef: window,
      getNow: () => now,
    })

    lifecycle.start()
    await Promise.resolve()
    await Promise.resolve()

    expect(scheduleRun).toHaveBeenCalledTimes(1)

    now = 2000
    setVisibilityState('hidden')
    document.dispatchEvent(new Event('visibilitychange'))
    setVisibilityState('visible')
    document.dispatchEvent(new Event('visibilitychange'))
    await Promise.resolve()

    expect(scheduleRun).toHaveBeenCalledTimes(1)
    lifecycle.stop()
  })

  it('runs one bounded delayed retry after failure and waits for later triggers afterward', async () => {
    vi.useFakeTimers()
    const scheduleRun = vi.fn(async () => {
      throw new Error('schedule failed')
    })
    const coordinator = createCoordinatorWithTasks([
      createTask('schedule', scheduleRun),
      createTask('bookings', async () => {
        throw new Error('bookings failed')
      }),
      createTask('transactions', async () => {
        throw new Error('transactions failed')
      }),
    ])
    const lifecycle = new OfflineSyncLifecycle({
      getContext: () => context,
      coordinator,
      connectivity: new BrowserConnectivityMonitor({ windowRef: window }),
      config: { resumeMinAgeMs: 120000, failedRetryDelayMs: 30000 },
      documentRef: document,
      windowRef: window,
    })

    lifecycle.start()
    await Promise.resolve()
    await Promise.resolve()

    expect(scheduleRun).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(30000)
    await Promise.resolve()

    expect(scheduleRun).toHaveBeenCalledTimes(2)

    await vi.advanceTimersByTimeAsync(120000)
    await Promise.resolve()

    expect(scheduleRun).toHaveBeenCalledTimes(2)

    await lifecycle.requestManualSync()

    expect(scheduleRun).toHaveBeenCalledTimes(3)
    lifecycle.stop()
  })

  it('cancels active ownership when the lifecycle stops', async () => {
    const receivedSignals: AbortSignal[] = []
    const scheduleGate = createDeferred<DatasetSyncTaskResult>()
    const coordinator = createCoordinatorWithTasks([
      createTask('schedule', async ({ signal }) => {
        receivedSignals.push(signal)
        return scheduleGate.promise
      }),
      createTask('bookings', async () => createResult('bookings')),
      createTask('transactions', async () => createResult('transactions')),
    ])
    const lifecycle = new OfflineSyncLifecycle({
      getContext: () => context,
      coordinator,
      connectivity: new BrowserConnectivityMonitor({ windowRef: window }),
      documentRef: document,
      windowRef: window,
    })

    lifecycle.start()
    await Promise.resolve()
    lifecycle.stop()

    expect(receivedSignals[0]?.aborted).toBe(true)
  })
})
