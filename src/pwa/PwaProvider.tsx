import {
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import { PwaContext } from './pwaContext'
import { usePwaInstall } from './pwaInstall'
import { pwaRegistration } from './pwaRegistration'
import { requestPersistentStorageOnce } from './storagePersistence'

export interface PwaProviderProps {
  children: ReactNode
}

/** Owns the one app-level service-worker and install-prompt lifecycle. */
export function PwaProvider({ children }: PwaProviderProps) {
  const installState = usePwaInstall()
  const registrationSnapshot = useSyncExternalStore(
    pwaRegistration.subscribe,
    pwaRegistration.getSnapshot,
    pwaRegistration.getSnapshot,
  )

  useEffect(() => {
    pwaRegistration.start()
    void requestPersistentStorageOnce()
  }, [])

  return (
    <PwaContext.Provider
      value={{
        ...installState,
        applyUpdate: pwaRegistration.applyUpdate,
        postponeUpdate: pwaRegistration.postponeUpdate,
        updateAvailable: registrationSnapshot.updateAvailable,
      }}
    >
      {children}
    </PwaContext.Provider>
  )
}
