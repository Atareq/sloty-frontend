import { apiRequest } from '../../core/api/apiClient'
import type { PaginatedResponse } from '../../shared/api/api.types'
import { apiEndpoints } from '../../shared/api/apiEndpoints'
import type { ClubUser, ClubUsersQueryParams } from './clubUsers.types'

function buildClubUsersQueryString(params?: ClubUsersQueryParams): string {
  const searchParams = new URLSearchParams()

  if (params?.role) {
    searchParams.set('role', params.role)
  }

  if (params?.court) {
    searchParams.set('court', String(params.court))
  }

  if (params?.is_active !== undefined && params.is_active !== '') {
    searchParams.set('is_active', String(params.is_active))
  }

  if (params?.search?.trim()) {
    searchParams.set('search', params.search.trim())
  }

  const queryString = searchParams.toString()

  return queryString ? `?${queryString}` : ''
}

/**
 * Lists users attached to one selected club.
 *
 * The backend may return a plain array or a paginated response; page code
 * normalizes both shapes so the API wrapper preserves the backend contract.
 */
export function listClubUsers(
  clubSlug: string,
  params?: ClubUsersQueryParams,
): Promise<ClubUser[] | PaginatedResponse<ClubUser>> {
  return apiRequest<ClubUser[] | PaginatedResponse<ClubUser>>(
    `${apiEndpoints.clubs.users.list(clubSlug)}${buildClubUsersQueryString(params)}`,
  )
}
