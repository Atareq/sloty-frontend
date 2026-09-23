import { apiRequest } from '../../core/api/apiClient'
import type { PaginatedResponse } from '../../shared/api/api.types'
import { apiEndpoints } from '../../shared/api/apiEndpoints'
import type {
  ClubUser,
  ClubUsersQueryParams,
  CreateClubStaffPayload,
  UpdateClubUserPayload,
} from './clubUsers.types'

function buildClubStaffQueryString(params?: ClubUsersQueryParams): string {
  const searchParams = new URLSearchParams()

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
 * Lists staff attached to one selected club via GET /api/v1/clubs/{slug}/staff/
 */
export function listClubUsers(
  clubSlug: string,
  params?: ClubUsersQueryParams,
): Promise<ClubUser[] | PaginatedResponse<ClubUser>> {
  return apiRequest<ClubUser[] | PaginatedResponse<ClubUser>>(
    `${apiEndpoints.clubs.staff.list(clubSlug)}${buildClubStaffQueryString(params)}`,
  )
}

/**
 * Creates club staff via POST /api/v1/users/
 * Creates club staff via confirmed backend endpoint: POST /api/v1/clubs/{slug}/staff/
 */
export function createClubStaff(
  clubSlug: string,
  payload: CreateClubStaffPayload,
): Promise<ClubUser>
export function createClubStaff(
  payload: CreateClubStaffPayload,
): Promise<ClubUser>
export function createClubStaff(
  clubSlugOrPayload: string | CreateClubStaffPayload,
  maybePayload?: CreateClubStaffPayload,
): Promise<ClubUser> {
  const isClubSlugString = typeof clubSlugOrPayload === 'string'
  const clubSlug = isClubSlugString ? clubSlugOrPayload : clubSlugOrPayload.club_slug
  const payload = isClubSlugString ? maybePayload! : clubSlugOrPayload

  const path = clubSlug
    ? apiEndpoints.clubs.staff.list(clubSlug)
    : apiEndpoints.users.list

  return apiRequest<ClubUser>(path, {
    method: 'POST',
    body: {
      phone_number: optionalText(payload.phone_number),
      password: payload.password,
      email: optionalText(payload.email) ?? '',
      first_name: payload.first_name.trim(),
      last_name: optionalText(payload.last_name) ?? '',
      court_ids: payload.court_ids ?? [],
      ...(payload.is_active !== undefined ? { is_active: payload.is_active } : {}),
    },
  })
}

/**
 * Updates a club user via PATCH /api/v1/users/{id}/
 * Updates a club staff user via PATCH /api/v1/users/{id}/ or PATCH /api/v1/clubs/{slug}/staff/{profileId}/
 */
export function updateClubUser(
  userId: number | string,
  payload: UpdateClubUserPayload,
): Promise<ClubUser>
export function updateClubUser(
  clubSlug: string,
  profileId: number | string,
  payload: UpdateClubUserPayload,
): Promise<ClubUser>
export function updateClubUser(
  clubSlugOrId: string | number,
  idOrPayload: number | string | UpdateClubUserPayload,
  maybePayload?: UpdateClubUserPayload,
): Promise<ClubUser> {
  if (typeof clubSlugOrId === 'string' && (typeof idOrPayload === 'number' || typeof idOrPayload === 'string')) {
    return apiRequest<ClubUser>(apiEndpoints.clubs.staff.detail(clubSlugOrId, idOrPayload), {
      method: 'PATCH',
      body: maybePayload,
    })
  }

  const userId = clubSlugOrId
  const payload = idOrPayload as UpdateClubUserPayload

  return apiRequest<ClubUser>(apiEndpoints.users.detail(userId), {
    method: 'PATCH',
    body: payload,
  })
}

/**
 * Updates court assignments for a staff member via PUT /api/v1/clubs/{slug}/staff/{profileId}/courts/
 */
export function updateStaffCourts(
  clubSlug: string,
  profileId: number | string,
  courtIds: number[],
): Promise<void> {
  return apiRequest<void>(apiEndpoints.clubs.staff.courts(clubSlug, profileId), {
    method: 'PUT',
    body: {
      court_ids: courtIds,
    },
  })
}
