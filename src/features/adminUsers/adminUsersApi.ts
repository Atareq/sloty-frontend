import { apiRequest } from '../../core/api/apiClient'
import type { PaginatedResponse } from '../../shared/api/api.types'
import { apiEndpoints } from '../../shared/api/apiEndpoints'
import type {
  PlatformAdminUserPayload,
  PlatformUser,
  PlatformUsersQueryParams,
  UpdatePlatformUserPayload,
} from './adminUsers.types'

function buildPlatformUsersQueryString(
  params?: PlatformUsersQueryParams,
): string {
  const searchParams = new URLSearchParams()

  if (params?.search?.trim()) {
    searchParams.set('search', params.search.trim())
  }

  if (params?.account_type) {
    searchParams.set('account_type', params.account_type)
  }

  if (params?.club) {
    searchParams.set('club', String(params.club))
  }

  if (params?.role) {
    searchParams.set('role', params.role)
  }

  if (params?.is_active !== undefined && params.is_active !== '') {
    searchParams.set('is_active', String(params.is_active))
  }

  const queryString = searchParams.toString()

  return queryString ? `?${queryString}` : ''
}

function optionalText(value: string | undefined): string | undefined {
  const trimmedValue = value?.trim()

  return trimmedValue ? trimmedValue : undefined
}

function normalizePlatformAdminPayload(
  payload: PlatformAdminUserPayload,
): PlatformAdminUserPayload {
  return {
    username: payload.username.trim(),
    password: payload.password,
    first_name: payload.first_name.trim(),
    last_name: optionalText(payload.last_name),
    email: optionalText(payload.email),
    phone_number: optionalText(payload.phone_number),
    is_active: payload.is_active,
  }
}

/**
 * Lists platform users from the global user endpoint.
 *
 * The completed backend owns primary filtering for global users. The frontend
 * keeps filters URL-driven, then sends the supported query params here.
 */
export function listPlatformUsers(
  params?: PlatformUsersQueryParams,
): Promise<PlatformUser[] | PaginatedResponse<PlatformUser>> {
  return apiRequest<PlatformUser[] | PaginatedResponse<PlatformUser>>(
    `${apiEndpoints.users.list}${buildPlatformUsersQueryString(params)}`,
  )
}

export function getPlatformUser(
  userId: number | string,
): Promise<PlatformUser> {
  return apiRequest<PlatformUser>(apiEndpoints.users.detail(userId))
}

export function createPlatformAdmin(
  payload: PlatformAdminUserPayload,
): Promise<PlatformUser> {
  return apiRequest<PlatformUser>(apiEndpoints.users.list, {
    method: 'POST',
    body: normalizePlatformAdminPayload(payload),
  })
}

export function updatePlatformUser(
  userId: number | string,
  payload: UpdatePlatformUserPayload,
): Promise<PlatformUser> {
  return apiRequest<PlatformUser>(apiEndpoints.users.detail(userId), {
    method: 'PATCH',
    body: payload,
  })
}
