import type { Court } from '../courts/courts.types'
import type { ClubUser } from './clubUsers.types'

export function getClubUserDisplayName(user: ClubUser): string {
  const fullName = [user.first_name, user.last_name]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' ')

  return fullName || user.username
}

export function getManagerIdentity(user: ClubUser): string {
  return getClubUserDisplayName(user) || user.phone_number || user.username
}

export function getUserCourtName(user: ClubUser, courts: Court[]): string | null {
  if (user.court_name) {
    return user.court_name
  }

  if (!user.court) {
    return null
  }

  return courts.find((court) => court.id === user.court)?.name ?? `ملعب #${user.court}`
}
