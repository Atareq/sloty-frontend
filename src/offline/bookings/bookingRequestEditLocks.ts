const lockedRequestIdsByScope = new Map<string, Set<string>>()

/**
 * Coordinates short-lived UI edits with the background Booking Request sync.
 *
 * The lock is intentionally process-local: it only protects values being edited
 * in the current app session. Persisted request state is still re-read before
 * every network attempt.
 */
export const bookingRequestEditLocks = {
  lock(scopeKey: string, localId: string): void {
    const lockedIds = lockedRequestIdsByScope.get(scopeKey) ?? new Set<string>()

    lockedIds.add(localId)
    lockedRequestIdsByScope.set(scopeKey, lockedIds)
  },

  unlock(scopeKey: string, localId: string): void {
    const lockedIds = lockedRequestIdsByScope.get(scopeKey)

    if (!lockedIds) {
      return
    }

    lockedIds.delete(localId)

    if (lockedIds.size === 0) {
      lockedRequestIdsByScope.delete(scopeKey)
    }
  },

  isLocked(scopeKey: string, localId: string): boolean {
    return lockedRequestIdsByScope.get(scopeKey)?.has(localId) ?? false
  },

  resetForTests(): void {
    lockedRequestIdsByScope.clear()
  },
}
