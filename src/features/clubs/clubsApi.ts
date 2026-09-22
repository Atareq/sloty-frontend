import { apiRequest } from '../../core/api/apiClient'
import type { PaginatedResponse } from '../../shared/api/pagination.types'
import { fetchAllPages } from '../../shared/api/pagination.helpers'
import { apiEndpoints } from '../../shared/api/apiEndpoints'
import { buildPathWithQuery } from '../../shared/utils/buildPathWithQuery'
import type { Club, ClubPayload } from './clubs.types'

export interface ListClubsParams {
  search?: string
  page?: number
}

export interface ListClubsOptions {
  signal?: AbortSignal
  nextUrl?: string
  params?: ListClubsParams
}

/**
 * Lists clubs for the platform setup and selection screens.
 *
 * Supports DRF pagination:
 * - Pass `nextUrl` to follow a previous paginated response page link.
 * - Pass `params.search` to filter clubs by name on the backend.
 * - String argument is treated as `nextUrl` for backward compatibility with `fetchAllPages`.
 */
export function listClubs(
  optionsOrNextUrl?: string | ListClubsOptions,
): Promise<PaginatedResponse<Club>> {
  let path: string = apiEndpoints.clubs.list
  let signal: AbortSignal | undefined

  if (typeof optionsOrNextUrl === 'string') {
    path = optionsOrNextUrl
  } else if (optionsOrNextUrl) {
    if (optionsOrNextUrl.nextUrl) {
      path = optionsOrNextUrl.nextUrl
    } else if (optionsOrNextUrl.params) {
      path = buildPathWithQuery(apiEndpoints.clubs.list, {
        search: optionsOrNextUrl.params.search?.trim(),
        page: optionsOrNextUrl.params.page,
      })
    }
    signal = optionsOrNextUrl.signal
  }

  if (signal) {
    return apiRequest<PaginatedResponse<Club>>(path, { signal })
  }

  return apiRequest<PaginatedResponse<Club>>(path)
}

/**
 * Fetches all accessible clubs by following `next` pagination links until null.
 */
export function fetchAllClubs(
  options: { signal?: AbortSignal } = {},
): Promise<Club[]> {
  return fetchAllPages((nextUrl) =>
    listClubs(
      typeof nextUrl === 'string'
        ? nextUrl
        : { nextUrl, signal: options.signal },
    ),
  )
}


export function createClub(payload: ClubPayload): Promise<Club> {
  return apiRequest<Club>(apiEndpoints.clubs.list, {
    method: 'POST',
    body: payload,
  })
}

export function getClub(clubId: number | string): Promise<Club> {
  return apiRequest<Club>(apiEndpoints.clubs.detail(clubId))
}

export function updateClub(
  clubId: number | string,
  payload: ClubPayload,
): Promise<Club> {
  return apiRequest<Club>(apiEndpoints.clubs.detail(clubId), {
    method: 'PATCH',
    body: payload,
  })
}
