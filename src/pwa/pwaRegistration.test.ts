import type { RegisterSWOptions } from 'vite-plugin-pwa/types'
import { describe, expect, it, vi } from 'vitest'
import { createPwaRegistrationStore } from './pwaRegistration'

describe('PWA service-worker registration store', () => {
  it('registers once and announces a waiting update without applying it', () => {
    let onNeedRefresh: (() => void) | undefined
    const updateServiceWorker = vi.fn().mockResolvedValue(undefined)
    const registerServiceWorker = vi.fn(
      (options?: RegisterSWOptions) => {
        onNeedRefresh = options?.onNeedRefresh
        return updateServiceWorker
      },
    )
    const store = createPwaRegistrationStore(registerServiceWorker)
    const listener = vi.fn()

    store.subscribe(listener)
    store.start()
    store.start()
    onNeedRefresh?.()

    expect(registerServiceWorker).toHaveBeenCalledTimes(1)
    expect(store.getSnapshot().updateAvailable).toBe(true)
    expect(listener).toHaveBeenCalledTimes(1)
    expect(updateServiceWorker).not.toHaveBeenCalled()
  })

  it('applies the waiting worker only after explicit confirmation', async () => {
    const updateServiceWorker = vi.fn().mockResolvedValue(undefined)
    const store = createPwaRegistrationStore(() => updateServiceWorker)

    store.start()
    expect(updateServiceWorker).not.toHaveBeenCalled()

    await store.applyUpdate()

    expect(updateServiceWorker).toHaveBeenCalledWith(true)
  })

  it('postpones the update without nagging again in the same session', () => {
    let onNeedRefresh: (() => void) | undefined
    const store = createPwaRegistrationStore((options) => {
      onNeedRefresh = options?.onNeedRefresh
      return vi.fn().mockResolvedValue(undefined)
    })

    store.start()
    onNeedRefresh?.()
    expect(store.getSnapshot().updateAvailable).toBe(true)

    store.postponeUpdate()
    onNeedRefresh?.()

    expect(store.getSnapshot().updateAvailable).toBe(false)
  })
})
