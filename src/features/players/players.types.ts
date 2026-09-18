import type { Country } from 'react-phone-number-input'
import { normalizeSlotyPhoneNumber } from '../../shared/validation/phone'

export interface PlayerProfile {
  id: number
  phone_number: string
  full_name: string
  verified: boolean
  has_account: boolean
  created_at: string
  updated_at: string
}

export interface ClubPlayer {
  id: number
  player_profile: PlayerProfile
  display_name: string
  player_number: number
  last_used_at: string | null
}

export interface ListClubPlayersParams {
  search?: string
  order_by?: string
  page?: number
  page_size?: number
}

/**
 * Extracts the player's primary phone number from `player_profile`.
 */
export function getClubPlayerPhone(
  player: ClubPlayer | null | undefined,
): string {
  if (!player) {
    return ''
  }
  return (
    player.player_profile?.phone_number ||
    (player as unknown as { phone_number?: string })?.phone_number ||
    ''
  )
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
