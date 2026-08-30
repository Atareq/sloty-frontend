import type { BackendReachability } from '../sync/sync.types'

export type BrowserNetworkState = 'unknown' | 'likely_online' | 'offline'
export type BrowserConnectivityEvent = 'online' | 'offline' | null

export interface ConnectivitySnapshot {
  browserNetwork: BrowserNetworkState
  backendReachability: BackendReachability
  lastConnectivityChangeAt: string | null
  lastBrowserEvent: BrowserConnectivityEvent
  eventVersion: number
}

type ConnectivityListener = () => void

interface BrowserConnectivityMonitorOptions {
  getNow?: () => Date
  windowRef?: Window
}

function getInitialBrowserNetwork(windowRef?: Window): BrowserNetworkState {
  if (!windowRef || typeof windowRef.navigator.onLine !== 'boolean') {
    return 'unknown'
  }

  return windowRef.navigator.onLine ? 'likely_online' : 'offline'
}

/** Centralizes browser online/offline hints for offline infrastructure. */
export class BrowserConnectivityMonitor {
  private readonly getNow: () => Date
  private readonly windowRef?: Window
  private listeners: ConnectivityListener[] = []
  private isStarted = false
  private snapshot: ConnectivitySnapshot

  constructor(options: BrowserConnectivityMonitorOptions = {}) {
    this.windowRef =
      options.windowRef ??
      (typeof window === 'undefined' ? undefined : window)
    this.getNow = options.getNow ?? (() => new Date())
    this.snapshot = {
      browserNetwork: getInitialBrowserNetwork(this.windowRef),
      backendReachability: 'unknown',
      lastConnectivityChangeAt: null,
      lastBrowserEvent: null,
      eventVersion: 0,
    }
  }

  getSnapshot = (): ConnectivitySnapshot => this.snapshot

  subscribe = (listener: ConnectivityListener): (() => void) => {
    this.listeners = [...this.listeners, listener]

    return () => {
      this.listeners = this.listeners.filter(
        (currentListener) => currentListener !== listener,
      )
    }
  }

  start(): void {
    if (this.isStarted || !this.windowRef) {
      return
    }

    this.windowRef.addEventListener('online', this.handleOnline)
    this.windowRef.addEventListener('offline', this.handleOffline)
    this.isStarted = true
  }

  stop(): void {
    if (!this.isStarted || !this.windowRef) {
      return
    }

    this.windowRef.removeEventListener('online', this.handleOnline)
    this.windowRef.removeEventListener('offline', this.handleOffline)
    this.isStarted = false
  }

  markBackendReachable(): void {
    this.update({
      backendReachability: 'reachable',
      lastConnectivityChangeAt: this.getNow().toISOString(),
    })
  }

  markBackendUnreachable(): void {
    this.update({
      backendReachability: 'unreachable',
      lastConnectivityChangeAt: this.getNow().toISOString(),
    })
  }

  private handleOnline = (): void => {
    this.update({
      browserNetwork: 'likely_online',
      backendReachability: 'unknown',
      lastConnectivityChangeAt: this.getNow().toISOString(),
      lastBrowserEvent: 'online',
      eventVersion: this.snapshot.eventVersion + 1,
    })
  }

  private handleOffline = (): void => {
    this.update({
      browserNetwork: 'offline',
      lastConnectivityChangeAt: this.getNow().toISOString(),
      lastBrowserEvent: 'offline',
      eventVersion: this.snapshot.eventVersion + 1,
    })
  }

  private update(nextSnapshot: Partial<ConnectivitySnapshot>): void {
    this.snapshot = {
      ...this.snapshot,
      ...nextSnapshot,
    }
    this.listeners.forEach((listener) => listener())
  }
}

export const browserConnectivity = new BrowserConnectivityMonitor()
