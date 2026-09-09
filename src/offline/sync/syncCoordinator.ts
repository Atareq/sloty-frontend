import { canChooseOperationalCourt } from '../../core/auth/auth.types'
import { browserConnectivity } from '../connectivity/browserConnectivity'
import { createBookingSyncTask } from '../bookings/bookingSyncTask'
import { recheckBookingIntentsForScheduleCourts } from '../bookings/bookingIntentRecheck'
import {
  processPendingBookingRequests,
  type BookingRequestQueueResult,
} from '../bookings/bookingRequestSync'
import { createCurrentCustodySyncTask } from '../finance/currentCustodySyncTask'
import { offlineRepositories } from '../repositories/offlineRepositories'
import {
  createScheduleSyncTask,
  getAuthorizedScheduleCourtIds,
} from '../schedule/scheduleSyncTask'
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
type BookingRequestProcessor = (
  context: OperationalSyncContext,
  signal: AbortSignal,
  courtIds?: number[],
) => Promise<BookingRequestQueueResult>
type AuthorizedCourtsResolver = (
  context: OperationalSyncContext,
  signal: AbortSignal,
) => Promise<number[]>
type OperationalFreshnessRecorder = (
  context: OperationalSyncContext,
  syncedAt: string,
) => Promise<void>

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) {
    throw new DOMException('Operational sync was cancelled.', 'AbortError')
  }
}

function defaultAuthorizedCourtsResolver(
  context: OperationalSyncContext,
  signal: AbortSignal,
): Promise<number[]> {
  return getAuthorizedScheduleCourtIds(context, signal)
}

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
  processBookingRequests?: BookingRequestProcessor
  resolveAuthorizedCourts?: AuthorizedCourtsResolver
  recordOperationalSyncCompleted?: OperationalFreshnessRecorder
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
  private readonly processBookingRequests: BookingRequestProcessor
  private readonly resolveAuthorizedCourts: AuthorizedCourtsResolver
  private readonly recordOperationalSyncCompleted: OperationalFreshnessRecorder
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
    this.processBookingRequests =
      options.processBookingRequests ?? defaultBookingRequestProcessor
    this.resolveAuthorizedCourts =
      options.resolveAuthorizedCourts ?? defaultAuthorizedCourtsResolver
    this.recordOperationalSyncCompleted =
      options.recordOperationalSyncCompleted ?? defaultOperationalFreshnessRecorder
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
      if (!existingRun.controller.signal.aborted) {
        return existingRun.promise
      }

      this.fullRuns.delete(request.context.scopeKey)
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
    const run = this.fullRuns.get(scopeKey)
    if (run) {
      this.fullRuns.delete(scopeKey)
      run.controller.abort()
    }

    for (const [key] of this.datasetRuns) {
      if (key.startsWith(`${scopeKey}:`)) {
        this.datasetRuns.delete(key)
      }
    }

    if (this.snapshot.activeScopeKey === scopeKey && this.snapshot.status === 'syncing') {
      this.publishForScope(scopeKey, {
        status: 'idle',
        activeScopeKey: null,
        activeDataset: null,
      })
    }
  }

  cancelAll(): void {
    const runs = Array.from(this.fullRuns.values())
    this.fullRuns.clear()
    this.datasetRuns.clear()

    for (const run of runs) {
      run.controller.abort()
    }

    if (this.snapshot.status === 'syncing') {
      this.updateSnapshot({
        status: 'idle',
        activeScopeKey: null,
        activeDataset: null,
      })
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

    try {
      throwIfAborted(controller.signal)

      let authorizedCourtIds: number[] | undefined
      if (!canChooseOperationalCourt(context.role, context.membership)) {
        authorizedCourtIds = context.assignedCourtId
          ? [context.assignedCourtId]
          : []
      } else {
        try {
          authorizedCourtIds = await this.resolveAuthorizedCourts(
            context,
            controller.signal,
          )
        } catch (error) {
          if (controller.signal.aborted || isAbortError(error)) {
            throw error
          }
          this.logger?.(
            `[sync] authorized courts resolution failed scope=${context.scopeKey}`,
          )
        }
      }

      throwIfAborted(controller.signal)

      const bookingRequestsResult = await this.runBookingRequestsBeforeRefresh(
        context,
        controller.signal,
        authorizedCourtIds,
      )
      throwIfAborted(controller.signal)

      const shouldStopAfterBookingRequests = Boolean(
        bookingRequestsResult?.stopped,
      )
      const scheduleResult = shouldStopAfterBookingRequests
        ? createSkippedResult('schedule', 'booking_request_processing_stopped')
        : await this.runDataset(
            this.tasks.schedule,
            context,
            trigger,
            controller.signal,
            startedAt,
            authorizedCourtIds,
          )
      throwIfAborted(controller.signal)

      await this.runIntentRecheckAfterSchedule(context, scheduleResult)
      throwIfAborted(controller.signal)

      const secondaryResults = await Promise.all([
        shouldStopAfterBookingRequests
          ? Promise.resolve(
              createSkippedResult('bookings', 'booking_request_processing_stopped'),
            )
          : this.runDataset(
              this.tasks.bookings,
              context,
              trigger,
              controller.signal,
              startedAt,
            ),
        shouldStopAfterBookingRequests
          ? Promise.resolve(
              createSkippedResult(
                'transactions',
                'booking_request_processing_stopped',
              ),
            )
          : this.runDataset(
              this.tasks.transactions,
              context,
              trigger,
              controller.signal,
              startedAt,
            ),
      ])
      throwIfAborted(controller.signal)

      const currentCustodyResult = shouldStopAfterBookingRequests
        ? createSkippedResult(
            'current_custody',
            'booking_request_processing_stopped',
          )
        : await this.runDataset(
            this.tasks.current_custody,
            context,
            trigger,
            controller.signal,
            startedAt,
          )
      throwIfAborted(controller.signal)

      const datasets = createResultMap([
        scheduleResult,
        ...secondaryResults,
        currentCustodyResult,
      ])
      const runStatus = shouldStopAfterBookingRequests
        ? 'partial_failure'
        : getRunStatus(datasets)
      const completedAt = this.getNow().toISOString()
      const isStillRegisteredRun = (): boolean =>
        this.fullRuns.get(context.scopeKey)?.controller === controller

      if (!isStillRegisteredRun() || controller.signal.aborted) {
        throw new DOMException('Operational sync was cancelled.', 'AbortError')
      }

      if (runStatus === 'success') {
        try {
          await this.recordOperationalSyncCompleted(context, completedAt)
        } catch {
          this.logger?.(
            `[sync] operational freshness write failed scope=${context.scopeKey}`,
          )
        }
      }

      if (!isStillRegisteredRun() || controller.signal.aborted) {
        throw new DOMException('Operational sync was cancelled.', 'AbortError')
      }

      const result: OperationalSyncRunResult = {
        scopeKey: context.scopeKey,
        trigger,
        status: runStatus,
        datasets,
        ...(bookingRequestsResult
          ? { bookingRequests: bookingRequestsResult }
          : {}),
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
    } catch (error) {
      const completedAt = this.getNow().toISOString()
      const isStillRegisteredRun =
        this.fullRuns.get(context.scopeKey)?.controller === controller

      if (controller.signal.aborted || isAbortError(error)) {
        const cancelledResult: OperationalSyncRunResult = {
          scopeKey: context.scopeKey,
          trigger,
          status: 'cancelled',
          datasets: createResultMap(
            syncDatasets.map((dataset) => ({
              dataset,
              status: 'cancelled',
              reason: 'scope_cancelled',
            })),
          ),
          startedAt,
          completedAt,
        }

        this.logger?.(`[sync] cancelled scope=${context.scopeKey}`)
        if (
          isStillRegisteredRun &&
          this.snapshot.activeScopeKey === context.scopeKey &&
          this.snapshot.status === 'syncing'
        ) {
          this.publishForScope(context.scopeKey, {
            status: 'idle',
            activeScopeKey: null,
            activeDataset: null,
            lastRunCompletedAt: completedAt,
            lastRunResult: cancelledResult,
            backendReachability: browserConnectivity.getSnapshot().backendReachability,
          })
        }

        return cancelledResult
      }

      const failedResult: OperationalSyncRunResult = {
        scopeKey: context.scopeKey,
        trigger,
        status: 'failed',
        datasets: createResultMap(
          syncDatasets.map((dataset) => ({
            dataset,
            status: 'failed',
            error,
          })),
        ),
        startedAt,
        completedAt,
      }

      browserConnectivity.markBackendUnreachable()
      this.logger?.(`[sync] failed scope=${context.scopeKey}`)
      this.publishForScope(context.scopeKey, {
        status: 'failed',
        activeScopeKey: context.scopeKey,
        activeDataset: null,
        lastRunCompletedAt: completedAt,
        lastRunResult: failedResult,
        backendReachability: browserConnectivity.getSnapshot().backendReachability,
      })
      if (isStillRegisteredRun) {
        browserConnectivity.markBackendUnreachable()
        this.logger?.(`[sync] failed scope=${context.scopeKey}`)
        this.publishForScope(context.scopeKey, {
          status: 'failed',
          activeScopeKey: context.scopeKey,
          activeDataset: null,
          lastRunCompletedAt: completedAt,
          lastRunResult: failedResult,
          backendReachability: browserConnectivity.getSnapshot().backendReachability,
        })
      }

      return failedResult
    }
  }

  private runDataset(
    task: DatasetSyncTask,
    context: OperationalSyncContext,
    trigger: OperationalSyncRequest['trigger'],
    signal: AbortSignal,
    startedAt: string,
    authorizedCourtIds?: number[],
  ): Promise<DatasetSyncTaskResult> {
    if (signal.aborted) {
      return Promise.resolve({
        dataset: task.dataset,
        status: 'cancelled',
        reason: 'scope_cancelled',
      })
    }

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
          authorizedCourtIds,
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
      await this.recheckBookingIntentsForScheduleCourtsSafe(context, scheduleResult)
    } catch {
      this.logger?.(
        `[sync] booking intent recheck failed scope=${context.scopeKey}`,
      )
    }
  }

  private async recheckBookingIntentsForScheduleCourtsSafe(
    context: OperationalSyncContext,
    scheduleResult: DatasetSyncTaskResult,
  ): Promise<void> {
    await this.recheckBookingIntents(context, scheduleResult)
  }

  private async runBookingRequestsBeforeRefresh(
    context: OperationalSyncContext,
    signal: AbortSignal,
    courtIds?: number[],
  ): Promise<BookingRequestQueueResult | null> {
    try {
      const result =
        this.processBookingRequests === defaultBookingRequestProcessor
          ? await this.processBookingRequests(context, signal, courtIds)
          : await this.processBookingRequests(context, signal)

      if (result.processed > 0 || result.stopped) {
        this.logger?.(
          `[sync] booking requests processed scope=${context.scopeKey} processed=${result.processed}`,
        )
      }

      return result
    } catch (error) {
      if (signal.aborted || isAbortError(error)) {
        throw error
      }

      this.logger?.(
        `[sync] booking request processing failed scope=${context.scopeKey}`,
      )
      return null
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

async function defaultOperationalFreshnessRecorder(
  context: OperationalSyncContext,
  syncedAt: string,
): Promise<void> {
  await offlineRepositories.markOperationalSyncComplete(context, syncedAt)
}

async function defaultBookingRequestProcessor(
  context: OperationalSyncContext,
  signal: AbortSignal,
  courtIds?: number[],
): Promise<BookingRequestQueueResult> {
  const authorizedCourtIds =
    courtIds ?? (await getAuthorizedScheduleCourtIds(context, signal))

  return processPendingBookingRequests({
    courtIds: authorizedCourtIds,
    scope: context,
    signal,
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
