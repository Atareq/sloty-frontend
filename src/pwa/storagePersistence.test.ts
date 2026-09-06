import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  requestPersistentStorageOnce,
  resetPersistentStorageRequestForTests,
} from './storagePersistence'

function mockStorage(storage: Partial<StorageManager> | undefined): void {
  Object.defineProperty(navigator, 'storage', {
    configurable: true,
    value: storage,
  })
}

describe('storage persistence request', () => {
  afterEach(() => {
    resetPersistentStorageRequestForTests()
    vi.restoreAllMocks()
    mockStorage(undefined)
  })

  it('does not request persistence when storage is already persisted', async () => {
    const persist = vi.fn()
    mockStorage({
      persisted: vi.fn().mockResolvedValue(true),
      persist,
    })

    await expect(requestPersistentStorageOnce()).resolves.toEqual({
      persisted: true,
      requested: false,
      supported: true,
    })
    expect(persist).not.toHaveBeenCalled()
  })

  it('requests persistence once when supported and not already persisted', async () => {
    const persist = vi.fn().mockResolvedValue(true)
    mockStorage({
      persisted: vi.fn().mockResolvedValue(false),
      persist,
    })

    await expect(requestPersistentStorageOnce()).resolves.toEqual({
      persisted: true,
      requested: true,
      supported: true,
    })
    await expect(requestPersistentStorageOnce()).resolves.toMatchObject({
      requested: false,
      supported: true,
    })
    expect(persist).toHaveBeenCalledTimes(1)
  })

  it('continues when persistence is denied', async () => {
    mockStorage({
      persisted: vi.fn().mockResolvedValue(false),
      persist: vi.fn().mockResolvedValue(false),
    })

    await expect(requestPersistentStorageOnce()).resolves.toEqual({
      persisted: false,
      requested: true,
      supported: true,
    })
  })

  it('continues when StorageManager is unsupported', async () => {
    mockStorage(undefined)

    await expect(requestPersistentStorageOnce()).resolves.toEqual({
      persisted: null,
      requested: false,
      supported: false,
    })
  })

  it('continues when the browser storage API throws', async () => {
    mockStorage({
      persisted: vi.fn().mockRejectedValue(new Error('quota details')),
      persist: vi.fn(),
    })

    await expect(requestPersistentStorageOnce()).resolves.toEqual({
      persisted: null,
      requested: false,
      supported: true,
    })
  })
})
