import { browserConnectivity } from '../connectivity/browserConnectivity'
import { createBookingSyncTask } from '../bookings/bookingSyncTask'
import { recheckBookingIntentsForScheduleCourts } from '../bookings/bookingIntentRecheck'
import { createCurrentCustodySyncTask } from '../finance/currentCustodySyncTask'
import { createScheduleSyncTask } from '../schedule/scheduleSyncTask'
import { createTransactionSyncTask } from '../transactions/transactionSyncTask'
import type {
  DatasetSyncTask,
  DatasetSyncTaskResult,
  OfflineSyncSnapshot,
  OperationalSyncContext,
  OperationalSyncRequest,
  OperationalSyncRunResult,
  SyncDataset,
} from './sync.types'

type SyncListener = () => void
type SyncLogger = (message: string) => void
type IntentRecheckRunner = (
  context: OperationalSyncContext,
  scheduleResult: DatasetSyncTaskResult,
) => Promise<void>

const syncDatasets: SyncDataset[] = [
  'schedule',
  'bookings',
  'transactions',
  'current_custody',
]

function createSkippedResult(
  dataset: SyncDataset,
  reason: string,
): DatasetSyncTaskResult {
  return {
    dataset,
    status: 'skipped',
    reason,
  }
}

function createResultMap(
  results: DatasetSyncTaskResult[],
): Record<SyncDataset, DatasetSyncTaskResult> {
  const resultMap = Object.fromEntries(
    syncDatasets.map((dataset) => [
      dataset,
      createSkippedResult(dataset, 'not_run'),
    ]),
  ) as Record<SyncDataset, DatasetSyncTaskResult>

  for (const result of results) {
    resultMap[result.dataset] = result
  }

  return resultMap
}

function isAbortError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    error.name === 'AbortError'
  )
}

function hasBackendSuccess(result: OperationalSyncRunResult): boolean {
  return Object.values(result.datasets).some(
    (datasetResult) => datasetResult.status === 'success',
  )
}

function hasDatasetFailure(result: OperationalSyncRunResult): boolean {
  return Object.values(result.datasets).some(
    (datasetResult) => datasetResult.status === 'failed',
  )
}

function getRunStatus(
  resultMap: Record<SyncDataset, DatasetSyncTaskResult>,
): OperationalSyncRunResult['status'] {
  const results = Object.values(resultMap)

  if (results.every((result) => result.status === 'cancelled')) {
    return 'cancelled'
  }

  if (results.every((result) => result.status === 'skipped')) {
    return 'skipped'
  }

  if (results.some((result) => result.status === 'failed')) {
    return results.some((result) => result.status === 'success')
      ? 'partial_failure'
      : 'failed'
  }

  return 'success'
}

function getSnapshotStatus(
  runResult: OperationalSyncRunResult,
): OfflineSyncSnapshot['status'] {
  if (runResult.status === 'failed') {
    return 'failed'
  }

  if (runResult.status === 'partial_failure') {
    return 'partial_failure'
  }

  return 'idle'
}

interface SyncCoordinatorOptions {
  tasks: DatasetSyncTask[]
  getNow?: () => Date
  recheckBookingIntents?: IntentRecheckRunner
  logger?: SyncLogger
}

interface FullRunEntry {
  controller: AbortController
  promise: Promise<OperationalSyncRunResult>
}

/**
 * Owns dataset synchronization priority and duplicate-trigger protection.
 *
 * This is intentionally not a general HTTP request de-duper. It only
 * coordinates Sloty's known offline datasets.
 */
export class OfflineSyncCoordinator {
  private readonly tasks: Record<SyncDataset, DatasetSyncTask>
  private readonly getNow: () => Date
  private readonly recheckBookingIntents: IntentRecheckRunner
  private readonly logger?: SyncLogger
  private readonly fullRuns = new Map<string, FullRunEntry>()
  private readonly datasetRuns = new Map<string, Promise<DatasetSyncTaskResult>>()
  private activeOwnerScopeKey: string | null | undefined
  private listeners: SyncListener[] = []
  private snapshot: OfflineSyncSnapshot = {
    status: 'idle',
    activeScopeKey: null,
    activeDataset: null,
    lastRunStartedAt: null,
    lastRunCompletedAt: null,
    lastRunResult: null,
    backendReachability: 'unknown',
  }

  constructor(options: SyncCoordinatorOptions) {
    const tasks = Object.fromEntries(
      options.tasks.map((task) => [task.dataset, task]),
    ) as Partial<Record<SyncDataset, DatasetSyncTask>>

    for (const dataset of syncDatasets) {
      if (!tasks[dataset]) {
        throw new Error(`Missing offline sync task: ${dataset}`)
      }
    }

    this.tasks = tasks as Record<SyncDataset, DatasetSyncTask>
    this.getNow = options.getNow ?? (() => new Date())
    this.recheckBookingIntents =
      options.recheckBookingIntents ?? defaultIntentRecheckRunner
    this.logger = options.logger
  }

  getSnapshot = (): OfflineSyncSnapshot => this.snapshot

  subscribe = (listener: SyncListener): (() => void) => {
    this.listeners = [...this.listeners, listener]

    return () => {
      this.listeners = this.listeners.filter(
        (currentListener) => currentListener !== listener,
      )
    }
  }

  requestSync(request: OperationalSyncRequest): Promise<OperationalSyncRunResult> {
    if (!request.context) {
      return this.createSkippedRun(request.trigger, 'no_operational_scope')
    }

    const existingRun = this.fullRuns.get(request.context.scopeKey)

    if (existingRun) {
      return existingRun.promise
    }

    const controller = new AbortController()
    const startedAt = this.getNow().toISOString()
    const promise = this.runOperationalSync(
      request.context,
      request.trigger,
      controller,
      startedAt,
    ).finally(() => {
      const activeRun = this.fullRuns.get(request.context!.scopeKey)

      if (activeRun?.promise === promise) {
        this.fullRuns.delete(request.context!.scopeKey)
      }
    })

    this.fullRuns.set(request.context.scopeKey, {
      controller,
      promise,
    })

    return promise
  }

  setActiveOwnerScope(scopeKey: string | null): void {
    this.activeOwnerScopeKey = scopeKey

    if (scopeKey === null) {
      this.cancelAll()
      this.updateSnapshot({
        status: 'idle',
        activeScopeKey: null,
        activeDataset: null,
      })
    }
  }

  cancelScope(scopeKey: string): void {
    this.fullRuns.get(scopeKey)?.controller.abort()
  }

  cancelAll(): void {
    for (const run of this.fullRuns.values()) {
      run.controller.abort()
    }
  }

  private async createSkippedRun(
    trigger: OperationalSyncRequest['trigger'],
    reason: string,
  ): Promise<OperationalSyncRunResult> {
    const now = this.getNow().toISOString()
    const result: OperationalSyncRunResult = {
      scopeKey: null,
      trigger,
      status: 'skipped',
      datasets: createResultMap(
        syncDatasets.map((dataset) => createSkippedResult(dataset, reason)),
      ),
      startedAt: now,
      completedAt: now,
    }

    return result
  }

  private async runOperationalSync(
    context: OperationalSyncContext,
    trigger: OperationalSyncRequest['trigger'],
    controller: AbortController,
    startedAt: string,
  ): Promise<OperationalSyncRunResult> {
    this.logger?.(`[sync] start scope=${context.scopeKey} trigger=${trigger}`)
    this.publishForScope(context.scopeKey, {
      status: 'syncing',
      activeScopeKey: context.scopeKey,
      activeDataset: null,
      lastRunStartedAt: startedAt,
    })

    const scheduleResult = await this.runDataset(
      this.tasks.schedule,
      context,
      trigger,
      controller.signal,
      startedAt,
    )
    await this.runIntentRecheckAfterSchedule(context, scheduleResult)
    const secondaryResults = await Promise.all([
      this.runDataset(
        this.tasks.bookings,
        context,
        trigger,
        controller.signal,
        startedAt,
      ),
      this.runDataset(
        this.tasks.transactions,
        context,
        trigger,
        controller.signal,
        startedAt,
      ),
    ])
    const currentCustodyResult = await this.runDataset(
      this.tasks.current_custody,
      context,
      trigger,
      controller.signal,
      startedAt,
    )
    const datasets = createResultMap([
      scheduleResult,
      ...secondaryResults,
      currentCustodyResult,
    ])
    const completedAt = this.getNow().toISOString()
    const result: OperationalSyncRunResult = {
      scopeKey: context.scopeKey,
      trigger,
      status: getRunStatus(datasets),
      datasets,
      startedAt,
      completedAt,
    }

    if (hasBackendSuccess(result)) {
      browserConnectivity.markBackendReachable()
    } else if (hasDatasetFailure(result)) {
      browserConnectivity.markBackendUnreachable()
    }

    this.logger?.(
      `[sync] complete scope=${context.scopeKey} status=${result.status}`,
    )
    this.publishForScope(context.scopeKey, {
      status: getSnapshotStatus(result),
      activeScopeKey: context.scopeKey,
      activeDataset: null,
      lastRunCompletedAt: completedAt,
      lastRunResult: result,
      backendReachability: browserConnectivity.getSnapshot().backendReachability,
    })

    return result
  }

  private runDataset(
    task: DatasetSyncTask,
    context: OperationalSyncContext,
    trigger: OperationalSyncRequest['trigger'],
    signal: AbortSignal,
    startedAt: string,
  ): Promise<DatasetSyncTaskResult> {
    const runKey = `${context.scopeKey}:${task.dataset}`
    const existingRun = this.datasetRuns.get(runKey)

    if (existingRun) {
      return existingRun
    }

    const promise = (async (): Promise<DatasetSyncTaskResult> => {
      this.logger?.(`[sync] start ${task.dataset} scope=${context.scopeKey}`)
      this.publishForScope(context.scopeKey, {
        activeDataset: task.dataset,
      })

      try {
        const result = await task.run({
          operationalContext: context,
          trigger,
          signal,
          startedAt,
        })

        this.logger?.(
          `[sync] ${result.status} ${task.dataset} scope=${context.scopeKey}`,
        )
        return result
      } catch (error) {
        if (signal.aborted || isAbortError(error)) {
          return {
            dataset: task.dataset,
            status: 'cancelled',
            reason: 'scope_cancelled',
          }
        }

        this.logger?.(`[sync] failed ${task.dataset} scope=${context.scopeKey}`)
        return {
          dataset: task.dataset,
          status: 'failed',
          error,
        }
      }
    })().finally(() => {
      if (this.datasetRuns.get(runKey) === promise) {
        this.datasetRuns.delete(runKey)
      }
    })

    this.datasetRuns.set(runKey, promise)

    return promise
  }

  private async runIntentRecheckAfterSchedule(
    context: OperationalSyncContext,
    scheduleResult: DatasetSyncTaskResult,
  ): Promise<void> {
    if (scheduleResult.status !== 'success') {
      return
    }

    try {
      await this.recheckBookingIntents(context, scheduleResult)
    } catch {
      this.logger?.(
        `[sync] booking intent recheck failed scope=${context.scopeKey}`,
      )
    }
  }

  private updateSnapshot(nextSnapshot: Partial<OfflineSyncSnapshot>): void {
    this.snapshot = {
      ...this.snapshot,
      ...nextSnapshot,
    }
    this.listeners.forEach((listener) => listener())
  }

  private publishForScope(
    scopeKey: string,
    nextSnapshot: Partial<OfflineSyncSnapshot>,
  ): void {
    if (
      this.activeOwnerScopeKey !== undefined &&
      this.activeOwnerScopeKey !== scopeKey
    ) {
      return
    }

    this.updateSnapshot(nextSnapshot)
  }
}

async function defaultIntentRecheckRunner(
  context: OperationalSyncContext,
  scheduleResult: DatasetSyncTaskResult,
): Promise<void> {
  const successfulCourtIds =
    scheduleResult.metadata?.successfulCourtIds?.filter(Number.isSafeInteger) ??
    []

  if (successfulCourtIds.length === 0) {
    return
  }

  await recheckBookingIntentsForScheduleCourts({
    courtIds: successfulCourtIds,
    scope: context,
  })
}

export function createNoopSyncTask(dataset: SyncDataset): DatasetSyncTask {
  return {
    dataset,
    async run() {
      return createSkippedResult(dataset, 'not_implemented_until_later_task')
    },
  }
}

function createDefaultSyncLogger(): SyncLogger | undefined {
  if (import.meta.env.PROD) {
    return undefined
  }

  return (message) => {
    console.info(message)
  }
}

export const offlineSyncCoordinator = new OfflineSyncCoordinator({
  tasks: [
    createScheduleSyncTask({
      logger: createDefaultSyncLogger(),
    }),
    createBookingSyncTask({
      logger: createDefaultSyncLogger(),
    }),
    createTransactionSyncTask({
      logger: createDefaultSyncLogger(),
    }),
    createCurrentCustodySyncTask({
      logger: createDefaultSyncLogger(),
    }),
  ],
  logger: createDefaultSyncLogger(),
})
