import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  OfflineSyncContext,
  type OfflineSyncContextValue,
} from '../../offline/sync/offlineSyncContext'
import { useOfflineReadonly } from './useOfflineReadonly'

function createMockContextValue(
  browserNetwork: 'likely_online' | 'offline' | 'unknown' = 'likely_online',
  backendReachability: 'reachable' | 'unreachable' | 'unknown' = 'reachable',
): OfflineSyncContextValue {
  return {
    connectivity: {
      browserNetwork,
      backendReachability,
      lastConnectivityChangeAt: null,
      lastBrowserEvent: null,
      eventVersion: 0,
    },
    freshness: {
      ageMs: 0,
      canCreateNewOfflineRequest: true,
      isLoading: false,
      lastSuccessfulOperationalSyncAt: null,
      level: 'fresh',
      warningText: null,
    },
    requestSync: vi.fn(),
    sync: {
      status: 'idle',
      activeScopeKey: null,
      activeDataset: null,
      lastRunStartedAt: null,
      lastRunCompletedAt: null,
      lastRunResult: null,
      backendReachability,
    },
  }
}

describe('useOfflineReadonly', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns isOffline=false when online and backend is reachable', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <OfflineSyncContext.Provider
        value={createMockContextValue('likely_online', 'reachable')}
      >
        {children}
      </OfflineSyncContext.Provider>
    )

    const { result } = renderHook(() => useOfflineReadonly(), { wrapper })
    expect(result.current.isOffline).toBe(false)
    const onError = vi.fn()
    const blocked = result.current.blockOfflineMutation(onError)
    expect(blocked).toBe(false)
    expect(onError).not.toHaveBeenCalled()
  })

  it('returns isOffline=true when browserNetwork is offline', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <OfflineSyncContext.Provider
        value={createMockContextValue('offline', 'reachable')}
      >
        {children}
      </OfflineSyncContext.Provider>
    )

    const { result } = renderHook(() => useOfflineReadonly(), { wrapper })
    expect(result.current.isOffline).toBe(true)
    const onError = vi.fn()
    const blocked = result.current.blockOfflineMutation(onError)
    expect(blocked).toBe(true)
    expect(onError).toHaveBeenCalledWith('يحتاج اتصال بالإنترنت')
  })

  it('returns isOffline=true when backendReachability is unreachable', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <OfflineSyncContext.Provider
        value={createMockContextValue('likely_online', 'unreachable')}
      >
        {children}
      </OfflineSyncContext.Provider>
    )

    const { result } = renderHook(() => useOfflineReadonly(), { wrapper })
    expect(result.current.isOffline).toBe(true)
  })

  it('supports custom offline message', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <OfflineSyncContext.Provider
        value={createMockContextValue('offline', 'unreachable')}
      >
        {children}
      </OfflineSyncContext.Provider>
    )

    const customMessage = 'لا يمكن تسجيل دفعات بدون إنترنت'
    const { result } = renderHook(() => useOfflineReadonly(customMessage), {
      wrapper,
    })
    expect(result.current.offlineMessage).toBe(customMessage)
    const onError = vi.fn()
    const blocked = result.current.blockOfflineMutation(onError)
    expect(blocked).toBe(true)
    expect(onError).toHaveBeenCalledWith(customMessage)
  })
})

