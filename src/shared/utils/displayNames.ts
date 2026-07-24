export interface DisplayableClubUser {
  id: number | string
  username?: string | null
  first_name?: string | null
  last_name?: string | null
  phone_number?: string | null
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
