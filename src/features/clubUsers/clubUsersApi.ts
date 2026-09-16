import { apiRequest } from '../../core/api/apiClient'
import type { PaginatedResponse } from '../../shared/api/api.types'
import { apiEndpoints } from '../../shared/api/apiEndpoints'
import type {
  ClubUser,
  ClubUsersQueryParams,
  CreateClubStaffPayload,
  UpdateClubUserPayload,
} from './clubUsers.types'

function buildClubUsersQueryString(
  clubSlug: string,
  params?: ClubUsersQueryParams,
): string {
  const searchParams = new URLSearchParams()

  searchParams.set('club', clubSlug)

  if (params?.role) {
    searchParams.set('role', params.role)
  }

  if (params?.is_active !== undefined && params.is_active !== '') {
    searchParams.set('is_active', String(params.is_active))
  }

  if (params?.search?.trim()) {
    searchParams.set('search', params.search.trim())
  }

  if (params?.page !== undefined) {
    searchParams.set('page', String(params.page))
  }

  const queryString = searchParams.toString()

  return queryString ? `?${queryString}` : ''
}

function optionalText(value: string | null | undefined): string | undefined {
  const trimmedValue = value?.trim()

  return trimmedValue ? trimmedValue : undefined
}

/**
 * Lists staff and users attached to one selected club via GET /api/v1/users/?club={slug}
 */
export function listClubUsers(
  clubSlug: string,
  params?: ClubUsersQueryParams,
): Promise<ClubUser[] | PaginatedResponse<ClubUser>> {
  return apiRequest<ClubUser[] | PaginatedResponse<ClubUser>>(
    `${apiEndpoints.users.list}${buildClubUsersQueryString(clubSlug, params)}`,
  )
}

/**
 * Creates club staff via POST /api/v1/users/
 */
export function createClubStaff(
  payload: CreateClubStaffPayload,
): Promise<ClubUser> {
  return apiRequest<ClubUser>(apiEndpoints.users.list, {
    method: 'POST',
    body: {
      username: payload.username.trim(),
      password: payload.password,
      first_name: payload.first_name.trim(),
      last_name: optionalText(payload.last_name) ?? '',
      email: optionalText(payload.email) ?? '',
      phone_number: optionalText(payload.phone_number),
      is_active: payload.is_active ?? true,
    },
  })
}

/**
 * Updates a club user via PATCH /api/v1/users/{id}/
 */
export function updateClubUser(
  userId: number | string,
  payload: UpdateClubUserPayload,
): Promise<ClubUser> {
  return apiRequest<ClubUser>(apiEndpoints.users.detail(userId), {
    method: 'PATCH',
    body: payload,
  })
}
