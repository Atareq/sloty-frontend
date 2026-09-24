export interface PlayerProfileSummary {
  id?: number
  phone_number?: string | null
  name?: string | null
  [key: string]: unknown
}

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
  display_name: string
  phone_number?: string | null
  player_profile?: PlayerProfileSummary | PlayerProfile | null
  last_used_at?: string | null
  has_account?: boolean
  player_number?: number
}

export interface ListClubPlayersParams {
  search?: string
  order_by?: string
  page?: number
  page_size?: number
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
  return (
    player.phone_number ||
    player.player_profile?.phone_number ||
    ''
  )
}
