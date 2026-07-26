import { apiRequest } from '../../core/api/apiClient'
import type { PaginatedResponse } from '../../shared/api/api.types'
import { apiEndpoints } from '../../shared/api/apiEndpoints'
import type {
  ClubUser,
  ClubUsersQueryParams,
  CreateMembershipPayload,
  UpdateManagerPermissionsPayload,
} from './clubUsers.types'

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

function optionalText(value: string | undefined): string | undefined {
  const trimmedValue = value?.trim()

  return trimmedValue ? trimmedValue : undefined
}

function normalizeCreateMembershipPayload(
  payload: CreateMembershipPayload,
): CreateMembershipPayload {
  const userPayload =
    'user' in payload
      ? {
          user: {
            username: payload.user.username.trim(),
            email: optionalText(payload.user.email),
            password: payload.user.password,
            first_name: payload.user.first_name.trim(),
            last_name: payload.user.last_name.trim(),
            phone_number: optionalText(payload.user.phone_number),
          },
        }
      : { user_id: payload.user_id }

  if (payload.role === 'STAFF') {
    return {
      ...userPayload,
      role: 'STAFF',
      court: payload.court ?? null,
    }
  }

  return {
    ...userPayload,
    role: 'MANAGER',
    court: null,
    manager_can_settle_transactions: Boolean(
      payload.manager_can_settle_transactions,
    ),
    manager_can_change_pricing: Boolean(payload.manager_can_change_pricing),
  }
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

/**
 * Creates a manager or staff membership in the selected club.
 *
 * The wrapper keeps the create payload on the membership contract and strips
 * fields that do not belong to the chosen role.
 */
export function createClubMembership(
  clubSlug: string,
  payload: CreateMembershipPayload,
): Promise<ClubUser> {
  return apiRequest<ClubUser>(apiEndpoints.clubs.memberships.list(clubSlug), {
    method: 'POST',
    body: normalizeCreateMembershipPayload(payload),
  })
}

/**
 * Updates permission flags for an existing manager membership.
 *
 * This intentionally patches the membership endpoint, not the club endpoint,
 * because manager permissions belong to the membership contract.
 */
export function updateManagerPermissions(
  clubSlug: string,
  membershipId: number | string,
  payload: UpdateManagerPermissionsPayload,
): Promise<ClubUser> {
  return apiRequest<ClubUser>(
    apiEndpoints.clubs.memberships.detail(clubSlug, membershipId),
    {
      method: 'PATCH',
      body: {
        manager_can_settle_transactions:
          payload.manager_can_settle_transactions,
        manager_can_change_pricing: payload.manager_can_change_pricing,
      },
    },
  )
}
