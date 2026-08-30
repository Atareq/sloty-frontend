import { registerSW } from 'virtual:pwa-register'
import type { RegisterSWOptions } from 'vite-plugin-pwa/types'

export interface PwaRegistrationSnapshot {
  updateAvailable: boolean
}

type UpdateServiceWorker = (reloadPage?: boolean) => Promise<void>
type RegisterServiceWorker = (
  options?: RegisterSWOptions,
) => UpdateServiceWorker

export interface PwaRegistrationStore {
  applyUpdate: () => Promise<void>
  getSnapshot: () => PwaRegistrationSnapshot
  postponeUpdate: () => void
  start: () => void
  subscribe: (listener: () => void) => () => void
}

const initialSnapshot: PwaRegistrationSnapshot = {
  updateAvailable: false,
}

/**
 * Creates a single-registration store so React StrictMode cannot register the
 * service worker twice. A waiting worker is applied only after explicit input.
 */
export function createPwaRegistrationStore(
  registerServiceWorker: RegisterServiceWorker = registerSW,
): PwaRegistrationStore {
  let hasStarted = false
  let isPostponed = false
  let snapshot = initialSnapshot
  let updateServiceWorker: UpdateServiceWorker = async () => undefined
  const listeners = new Set<() => void>()

  function setUpdateAvailable(updateAvailable: boolean): void {
    if (snapshot.updateAvailable === updateAvailable) {
      return
    }

    snapshot = { updateAvailable }
    listeners.forEach((listener) => listener())
  }

  return {
    async applyUpdate(): Promise<void> {
      await updateServiceWorker(true)
    },
    getSnapshot(): PwaRegistrationSnapshot {
      return snapshot
    },
    postponeUpdate(): void {
      isPostponed = true
      setUpdateAvailable(false)
    },
    start(): void {
      if (hasStarted) {
        return
      }

      hasStarted = true
      updateServiceWorker = registerServiceWorker({
        onNeedRefresh() {
          if (!isPostponed) {
            setUpdateAvailable(true)
          }
        },
        onRegisterError(error: unknown) {
          console.error('Sloty service worker registration failed.', error)
        },
      })
    },
    subscribe(listener: () => void): () => void {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

export const pwaRegistration = createPwaRegistrationStore()
