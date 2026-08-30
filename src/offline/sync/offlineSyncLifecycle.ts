import type {
  BrowserConnectivityMonitor,
  ConnectivitySnapshot,
} from '../connectivity/browserConnectivity'
import {
  browserConnectivity,
} from '../connectivity/browserConnectivity'
import { offlineSyncConfig, type OfflineSyncConfig } from './syncConfig'
import {
  offlineSyncCoordinator,
  type OfflineSyncCoordinator,
} from './syncCoordinator'
import type {
  OperationalSyncContext,
  OperationalSyncRunResult,
  SyncTrigger,
} from './sync.types'

interface OfflineSyncLifecycleOptions {
  getContext: () => OperationalSyncContext | null
  coordinator?: OfflineSyncCoordinator
  connectivity?: BrowserConnectivityMonitor
  config?: OfflineSyncConfig
  documentRef?: Document
  windowRef?: Window
  getNow?: () => number
}

/**
 * Owns app lifecycle sync triggers once for the authenticated shell.
 */
export class OfflineSyncLifecycle {
  private readonly getContext: () => OperationalSyncContext | null
  private readonly coordinator: OfflineSyncCoordinator
  private readonly connectivity: BrowserConnectivityMonitor
  private readonly config: OfflineSyncConfig
  private readonly documentRef?: Document
  private readonly windowRef?: Window
  private readonly getNow: () => number
  private unsubscribeConnectivity: (() => void) | null = null
  private lastConnectivityEventVersion = 0
  private lastRequestedScopeKey: string | null = null
  private lastCompletedAtMs = 0
  private retryTimeoutId: number | null = null
  private retryScheduledForScopeKey: string | null = null
  private isStarted = false

  constructor(options: OfflineSyncLifecycleOptions) {
    this.getContext = options.getContext
    this.coordinator = options.coordinator ?? offlineSyncCoordinator
    this.connectivity = options.connectivity ?? browserConnectivity
    this.config = options.config ?? offlineSyncConfig
    this.documentRef =
      options.documentRef ??
      (typeof document === 'undefined' ? undefined : document)
    this.windowRef =
      options.windowRef ??
      (typeof window === 'undefined' ? undefined : window)
    this.getNow = options.getNow ?? (() => Date.now())
  }

  start(): void {
    if (this.isStarted) {
      return
    }

    this.isStarted = true
    this.connectivity.start()
    this.lastConnectivityEventVersion =
      this.connectivity.getSnapshot().eventVersion
    this.unsubscribeConnectivity = this.connectivity.subscribe(
      this.handleConnectivityChange,
    )
    this.documentRef?.addEventListener(
      'visibilitychange',
      this.handleVisibilityChange,
    )
    this.coordinator.setActiveOwnerScope(this.getContext()?.scopeKey ?? null)
    void this.requestSync('startup')
  }

  stop(): void {
    if (!this.isStarted) {
      return
    }

    this.isStarted = false
    this.unsubscribeConnectivity?.()
    this.unsubscribeConnectivity = null
    this.documentRef?.removeEventListener(
      'visibilitychange',
      this.handleVisibilityChange,
    )
    this.clearRetry()

    if (this.lastRequestedScopeKey) {
      this.coordinator.cancelScope(this.lastRequestedScopeKey)
    }

    this.coordinator.setActiveOwnerScope(null)
  }

  updateContext(): void {
    const nextContext = this.getContext()
    const nextScopeKey = nextContext?.scopeKey ?? null

    if (
      this.lastRequestedScopeKey &&
      this.lastRequestedScopeKey !== nextScopeKey
    ) {
      this.coordinator.cancelScope(this.lastRequestedScopeKey)
      this.clearRetry()
    }

    this.coordinator.setActiveOwnerScope(nextScopeKey)

    if (nextScopeKey && nextScopeKey !== this.lastRequestedScopeKey) {
      void this.requestSync('startup')
    }
  }

  requestManualSync(): Promise<OperationalSyncRunResult> {
    return this.requestSync('manual', { force: true })
  }

  private handleConnectivityChange = (): void => {
    const snapshot = this.connectivity.getSnapshot()

    if (snapshot.eventVersion === this.lastConnectivityEventVersion) {
      return
    }

    this.lastConnectivityEventVersion = snapshot.eventVersion

    if (snapshot.lastBrowserEvent === 'online') {
      void this.requestSync('online')
    }
  }

  private handleVisibilityChange = (): void => {
    if (this.documentRef?.visibilityState !== 'visible') {
      return
    }

    if (!this.isBrowserLikelyOnline(this.connectivity.getSnapshot())) {
      return
    }

    const elapsedSinceLastCompleted = this.getNow() - this.lastCompletedAtMs

    if (
      this.lastCompletedAtMs > 0 &&
      elapsedSinceLastCompleted < this.config.resumeMinAgeMs
    ) {
      return
    }

    void this.requestSync('resume')
  }

  private async requestSync(
    trigger: SyncTrigger,
    options: { force?: boolean } = {},
  ): Promise<OperationalSyncRunResult> {
    const context = this.getContext()

    if (context) {
      this.lastRequestedScopeKey = context.scopeKey
    }

    const result = await this.coordinator.requestSync({
      context,
      trigger,
      force: options.force,
    })

    if (result.scopeKey === this.lastRequestedScopeKey) {
      this.lastCompletedAtMs = this.getNow()
    }

    if (
      result.scopeKey &&
      result.status === 'failed' &&
      trigger !== 'retry'
    ) {
      this.scheduleRetry(result.scopeKey)
    }

    return result
  }

  private scheduleRetry(scopeKey: string): void {
    if (this.retryTimeoutId !== null || !this.windowRef) {
      return
    }

    this.retryScheduledForScopeKey = scopeKey
    this.retryTimeoutId = this.windowRef.setTimeout(() => {
      this.retryTimeoutId = null
      const context = this.getContext()

      if (!context || context.scopeKey !== this.retryScheduledForScopeKey) {
        this.retryScheduledForScopeKey = null
        return
      }

      this.retryScheduledForScopeKey = null
      void this.requestSync('retry')
    }, this.config.failedRetryDelayMs)
  }

  private clearRetry(): void {
    if (this.retryTimeoutId === null || !this.windowRef) {
      return
    }

    this.windowRef.clearTimeout(this.retryTimeoutId)
    this.retryTimeoutId = null
    this.retryScheduledForScopeKey = null
  }

  private isBrowserLikelyOnline(snapshot: ConnectivitySnapshot): boolean {
    return snapshot.browserNetwork !== 'offline'
  }
}
