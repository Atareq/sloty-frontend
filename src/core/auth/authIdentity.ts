import type { AuthContextValue, CurrentUserProfile, ProfileId } from './auth.types'

/**
 * Extracts the authoritative operational Profile ID from either a `CurrentUserProfile`
 * or `AuthContextValue`.
 *
 * Invariant: The frontend must never infer or alias `profileId = user.id`.
 * If `profile_id` is missing or null, this returns `null`.
 */
export function getCurrentProfileId(
  profileOrAuth?: CurrentUserProfile | AuthContextValue | null,
): ProfileId | null {
  if (!profileOrAuth) {
    return null
  }

  if ('currentUser' in profileOrAuth) {
    return profileOrAuth.currentUser?.profile_id ?? null
  }

  return profileOrAuth.profile_id ?? null
}

/**
 * Checks whether the authenticated user has an active, explicit operational Profile.
 *
 * Users without a profile (e.g. { id: 50, profile_id: null }) are valid and allowed;
 * this helper returns `false` without causing logout.
 */
export function hasOperationalProfile(
  profileOrAuth?: CurrentUserProfile | AuthContextValue | null,
): boolean {
  return getCurrentProfileId(profileOrAuth) !== null
}

