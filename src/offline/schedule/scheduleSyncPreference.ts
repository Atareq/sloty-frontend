const preferredCourtByScope = new Map<string, number>()

/**
 * Remembers the currently viewed Court for sync ordering only.
 *
 * This is not authorization. Sync tasks still resolve allowed Courts from the
 * backend-authenticated operational context and courts endpoint.
 */
export function setPreferredScheduleCourt(scopeKey: string, courtId: number): void {
  preferredCourtByScope.set(scopeKey, courtId)
}

export function getPreferredScheduleCourt(scopeKey: string): number | null {
  return preferredCourtByScope.get(scopeKey) ?? null
}

export function clearPreferredScheduleCourt(scopeKey: string): void {
  preferredCourtByScope.delete(scopeKey)
}
