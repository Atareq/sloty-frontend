import { createContext, useContext } from 'react'
import type { ConnectivitySnapshot } from '../connectivity/browserConnectivity'
import type {
  OfflineSyncFreshnessSnapshot,
  OfflineSyncSnapshot,
  OperationalSyncRunResult,
} from './sync.types'

export interface OfflineSyncContextValue {
  connectivity: ConnectivitySnapshot
  freshness: OfflineSyncFreshnessSnapshot
  requestSync: () => Promise<OperationalSyncRunResult>
  sync: OfflineSyncSnapshot
}

export const OfflineSyncContext =
  createContext<OfflineSyncContextValue | null>(null)

export function useOfflineSync(): OfflineSyncContextValue {
  const context = useContext(OfflineSyncContext)

  if (!context) {
    throw new Error('useOfflineSync must be used inside OfflineSyncProvider')
  }

  return context
}
