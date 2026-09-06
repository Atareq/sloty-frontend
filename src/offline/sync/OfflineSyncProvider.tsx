import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import { useAuth } from '../../core/auth/useAuth'
import { browserConnectivity } from '../connectivity/browserConnectivity'
import {
  classifyOfflineFreshness,
  getOperationalFreshnessTimestamp,
} from '../freshness/offlineFreshness'
import { offlineRepositories } from '../repositories/offlineRepositories'
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

const initialFreshness = {
  ...classifyOfflineFreshness(null),
  isLoading: false,
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
  const [freshness, setFreshness] = useState(initialFreshness)
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
    let isCurrent = true

    async function loadFreshness(): Promise<void> {
      if (!operationalContext) {
        setFreshness(initialFreshness)
        return
      }

      setFreshness((current) => ({ ...current, isLoading: true }))

      try {
        const metadata = await offlineRepositories.getSyncMetadata(
          operationalContext,
        )
        const nextFreshness = classifyOfflineFreshness(
          getOperationalFreshnessTimestamp(metadata),
        )

        if (isCurrent) {
          setFreshness({ ...nextFreshness, isLoading: false })
        }
      } catch {
        if (isCurrent) {
          setFreshness({
            ...classifyOfflineFreshness(null),
            isLoading: false,
          })
        }
      }
    }

    void loadFreshness()

    return () => {
      isCurrent = false
    }
  }, [operationalContext, syncSnapshot.lastRunCompletedAt])

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
      freshness,
      requestSync: () =>
        lifecycleRef.current?.requestManualSync() ??
        offlineSyncCoordinator.requestSync({
          context: contextRef.current,
          trigger: 'manual',
          force: true,
        }),
      sync: syncSnapshot,
    }),
    [connectivitySnapshot, freshness, syncSnapshot],
  )

  return (
    <OfflineSyncContext.Provider value={value}>
      {children}
    </OfflineSyncContext.Provider>
  )
}
