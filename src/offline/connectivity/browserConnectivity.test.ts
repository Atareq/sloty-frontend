import { afterEach, describe, expect, it, vi } from 'vitest'
import { BrowserConnectivityMonitor } from './browserConnectivity'

function setNavigatorOnline(value: boolean): void {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    value,
  })
}

describe('BrowserConnectivityMonitor', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('treats navigator.onLine as a browser hint and updates on offline/online events', () => {
    setNavigatorOnline(true)
    const listener = vi.fn()
    const monitor = new BrowserConnectivityMonitor({
      getNow: () => new Date('2026-08-30T12:00:00.000Z'),
      windowRef: window,
    })

    monitor.subscribe(listener)
    monitor.start()

    setNavigatorOnline(false)
    window.dispatchEvent(new Event('offline'))

    expect(monitor.getSnapshot()).toMatchObject({
      browserNetwork: 'offline',
      backendReachability: 'unknown',
      lastBrowserEvent: 'offline',
      eventVersion: 1,
    })

    setNavigatorOnline(true)
    window.dispatchEvent(new Event('online'))

    expect(monitor.getSnapshot()).toMatchObject({
      browserNetwork: 'likely_online',
      backendReachability: 'unknown',
      lastBrowserEvent: 'online',
      eventVersion: 2,
    })
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('stores backend reachability separately from browser network state', () => {
    const monitor = new BrowserConnectivityMonitor({
      getNow: () => new Date('2026-08-30T12:00:00.000Z'),
      windowRef: window,
    })

    monitor.markBackendReachable()

    expect(monitor.getSnapshot().backendReachability).toBe('reachable')

    monitor.markBackendUnreachable()

    expect(monitor.getSnapshot().backendReachability).toBe('unreachable')
  })
})
