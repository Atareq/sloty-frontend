import type { Country } from 'react-phone-number-input'
import { normalizeSlotyPhoneNumber } from '../../shared/validation/phone'

export interface PlayerProfileSummary {
  id?: number
  phone_number?: string | null
  name?: string | null
  [key: string]: unknown
}

export interface ClubPlayer {
  id: number
  display_name: string
  phone_number?: string | null
  player_profile?: PlayerProfileSummary | null
  last_used_at?: string | null
  has_account?: boolean
}

export interface ListClubPlayersParams {
  search?: string
  order_by?: string
}

/**
 * Extracts the player's primary phone number whether stored at the top-level
 * or inside `player_profile`.
 */
export function getClubPlayerPhone(
  player: ClubPlayer | null | undefined,
): string {
  if (!player) {
    return ''
  }
  return player.phone_number || player.player_profile?.phone_number || ''
}

/**
 * Validates whether two phone number representations correspond to the same
 * physical phone, accounting for international E.164, local format, or raw digits.
 */
export function arePhoneNumbersMatching(
  phoneA?: string | null,
  phoneB?: string | null,
  country: Country = 'EG',
): boolean {
  if (!phoneA || !phoneB) {
    return false
  }

  const trimmedA = phoneA.trim()
  const trimmedB = phoneB.trim()
  if (!trimmedA || !trimmedB) {
    return false
  }

  if (trimmedA === trimmedB) {
    return true
  }

  const normA = normalizeSlotyPhoneNumber(trimmedA, country)
  const normB = normalizeSlotyPhoneNumber(trimmedB, country)
  if (normA && normB) {
    return normA === normB
  }

  const digitsA = trimmedA.replace(/\D/g, '')
  const digitsB = trimmedB.replace(/\D/g, '')
  if (!digitsA || !digitsB) {
    return false
  }

  return (
    digitsA === digitsB ||
    digitsA.endsWith(digitsB) ||
    digitsB.endsWith(digitsA)
  )
}
