import { apiRequest } from '../../core/api/apiClient'
import type { PaginatedResponse } from '../../shared/api/api.types'
import { apiEndpoints } from '../../shared/api/apiEndpoints'
import type { ClubPlayer, ListClubPlayersParams } from './players.types'

/**
 * Loads previously used club player identities matching a search query (phone or name),
 * ordered by `order_by` (typically `-last_used_at`).
 *
 * Backend ordering is preserved as-is. Never sort results in the frontend.
 * Catches offline or network failures gracefully and returns an empty array,
 * ensuring manual entry in the booking form is never blocked.
 */
export async function listClubPlayers(
  clubSlug: string,
  params?: ListClubPlayersParams,
): Promise<ClubPlayer[]> {
  const searchParams = new URLSearchParams()

  if (params?.search) {
    searchParams.set('search', params.search)
  }

  if (params?.order_by) {
    searchParams.set('order_by', params.order_by)
  }

  if (params?.page) {
    searchParams.set('page', String(params.page))
  }

  if (params?.page_size) {
    searchParams.set('page_size', String(params.page_size))
  }

  const queryString = searchParams.toString()
  const path = `${apiEndpoints.clubs.players.list(clubSlug)}${queryString ? `?${queryString}` : ''}`

  try {
    const response = await apiRequest<
      PaginatedResponse<ClubPlayer> | ClubPlayer[]
    >(path)

    if (Array.isArray(response)) {
      return response
    }

    if (Array.isArray(response?.results)) {
      return response.results
    }

    return []
  } catch {
    return []
  }
}
