export interface StoragePersistenceResult {
  persisted: boolean | null
  requested: boolean
  supported: boolean
}

const unsupportedResult: StoragePersistenceResult = {
  persisted: null,
  requested: false,
  supported: false,
}

let hasRequestedPersistence = false

function getStorageManager(): StorageManager | null {
  if (typeof navigator === 'undefined') {
    return null
  }

  return navigator.storage ?? null
}

/**
 * Requests persistent origin storage once per app lifecycle when the browser
 * supports it. Denial or browser errors are non-fatal because IndexedDB remains
 * best-effort origin storage.
 */
export async function requestPersistentStorageOnce(): Promise<StoragePersistenceResult> {
  if (hasRequestedPersistence) {
    return {
      persisted: null,
      requested: false,
      supported: Boolean(getStorageManager()),
    }
  }

  hasRequestedPersistence = true
  const storage = getStorageManager()

  if (!storage?.persisted || !storage.persist) {
    return unsupportedResult
  }

  try {
    const alreadyPersisted = await storage.persisted()

    if (alreadyPersisted) {
      return {
        persisted: true,
        requested: false,
        supported: true,
      }
    }

    const persisted = await storage.persist()

    return {
      persisted,
      requested: true,
      supported: true,
    }
  } catch {
    return {
      persisted: null,
      requested: false,
      supported: true,
    }
  }
}

export function resetPersistentStorageRequestForTests(): void {
  hasRequestedPersistence = false
}
