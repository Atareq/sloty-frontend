import {
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import { useAuth } from '../../core/auth/useAuth'
import { browserConnectivity } from '../connectivity/browserConnectivity'
import { createOperationalSyncContext } from './operationalSyncContext'
import { OfflineSyncLifecycle } from './offlineSyncLifecycle'
import {
  OfflineSyncContext,
  type OfflineSyncContextValue,
} from './offlineSyncContext'
import { offlineSyncCoordinator } from './syncCoordinator'

export interface OfflineSyncProviderProps {
  children: ReactNode
}

/**
 * Mounts the one authenticated owner for offline connectivity and sync events.
 */
export function OfflineSyncProvider({ children }: OfflineSyncProviderProps) {
  const auth = useAuth()
  const operationalContext = useMemo(
    () => createOperationalSyncContext(auth),
    [auth],
  )
  const contextRef = useRef(operationalContext)
  const lifecycleRef = useRef<OfflineSyncLifecycle | null>(null)
  const syncSnapshot = useSyncExternalStore(
    offlineSyncCoordinator.subscribe,
    offlineSyncCoordinator.getSnapshot,
    offlineSyncCoordinator.getSnapshot,
  )
  const connectivitySnapshot = useSyncExternalStore(
    browserConnectivity.subscribe,
    browserConnectivity.getSnapshot,
    browserConnectivity.getSnapshot,
  )

  useEffect(() => {
    contextRef.current = operationalContext
    lifecycleRef.current?.updateContext()
  }, [operationalContext])

  useEffect(() => {
    const lifecycle = new OfflineSyncLifecycle({
      getContext: () => contextRef.current,
    })
    lifecycleRef.current = lifecycle
    lifecycle.start()

    return () => {
      lifecycle.stop()
      lifecycleRef.current = null
    }
  }, [])

  const value = useMemo<OfflineSyncContextValue>(
    () => ({
      connectivity: connectivitySnapshot,
      requestSync: () =>
        lifecycleRef.current?.requestManualSync() ??
        offlineSyncCoordinator.requestSync({
          context: contextRef.current,
          trigger: 'manual',
          force: true,
        }),
      sync: syncSnapshot,
    }),
    [connectivitySnapshot, syncSnapshot],
  )

  return (
    <OfflineSyncContext.Provider value={value}>
      {children}
    </OfflineSyncContext.Provider>
  )
}
