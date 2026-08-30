import type { OfflineScope, ScopedOfflineRecord } from '../offline.types'

function assertPositiveUserId(userId: number): void {
  if (!Number.isSafeInteger(userId) || userId <= 0) {
    throw new Error('Offline scope requires a positive user ID.')
  }
}

function normalizeClubSlug(clubSlug: string): string {
  const normalizedSlug = clubSlug.trim()

  if (!normalizedSlug) {
    throw new Error('Offline scope requires a Club slug.')
  }

  return normalizedSlug
}

/** Creates the canonical user + Club ownership key for local business data. */
export function createOfflineScopeKey(scope: OfflineScope): string {
  assertPositiveUserId(scope.userId)

  return `user:${scope.userId}:club:${normalizeClubSlug(scope.clubSlug)}`
}

/** Converts a scope into the shared ownership columns stored on every row. */
export function getScopedRecordIdentity(
  scope: OfflineScope,
): ScopedOfflineRecord {
  const clubSlug = normalizeClubSlug(scope.clubSlug)

  return {
    scope_key: createOfflineScopeKey({ ...scope, clubSlug }),
    user_id: scope.userId,
    club_slug: clubSlug,
  }
}
