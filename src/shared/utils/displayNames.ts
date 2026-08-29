export interface DisplayableClubUser {
  id: number | string
  username?: string | null
  first_name?: string | null
  last_name?: string | null
  phone_number?: string | null
}

/**
 * Resolves the authenticated user's product-facing name without exposing a
 * username when a real profile or token display name is available.
 */
export function getAuthenticatedUserDisplayName(
  user: DisplayableClubUser | null,
  claimName?: string | null,
): string {
  const profileName = user
    ? joinNameParts([user.first_name, user.last_name])
    : ''

  return (
    profileName ||
    claimName?.trim() ||
    user?.username?.trim() ||
    'مستخدم سلوتي'
  )
}

export interface DisplayableCourt {
  id: number | string
  name?: string | null
}

function joinNameParts(parts: Array<string | null | undefined>): string {
  return parts
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ')
}

export function getClubUserDisplayName(user: DisplayableClubUser): string {
  const fullName = joinNameParts([user.first_name, user.last_name])

  return (
    fullName ||
    user.username?.trim() ||
    user.phone_number?.trim() ||
    `مستخدم #${user.id}`
  )
}

export function getCourtDisplayName(court: DisplayableCourt): string {
  return court.name?.trim() || `ملعب #${court.id}`
}
