import { apiRequest } from '../../core/api/apiClient'
import type { PaginatedResponse } from '../../shared/api/pagination.types'
import { fetchAllPages } from '../../shared/api/pagination.helpers'
import { apiEndpoints } from '../../shared/api/apiEndpoints'
import { buildPathWithQuery } from '../../shared/utils/buildPathWithQuery'
import type {
  Court,
  CourtImage,
  CourtMonthlyStatistics,
  CourtPayload,
} from './courts.types'

export interface ListCourtsParams {
  search?: string
  page?: number
  is_active?: boolean
}

export interface ListCourtsOptions {
  signal?: AbortSignal
  nextUrl?: string
  params?: ListCourtsParams
}

/**
 * API wrapper for courts nested under a club slug.
 *
 * Supports DRF pagination:
 * - Pass `nextUrl` to follow a previous paginated response page link.
 * - Pass `params.search` to filter courts by name on the backend.
 * - Pass `params.is_active` to filter active/inactive courts.
 */
export function listCourts(
  clubSlug: string,
  options: ListCourtsOptions | { signal?: AbortSignal; nextUrl?: string } = {},
): Promise<PaginatedResponse<Court>> {
  let path = apiEndpoints.clubs.courts.list(clubSlug)

  if (options.nextUrl) {
    path = options.nextUrl
  } else if ('params' in options && options.params) {
    path = buildPathWithQuery(apiEndpoints.clubs.courts.list(clubSlug), {
      search: options.params.search?.trim(),
      page: options.params.page,
      is_active: options.params.is_active,
    })
  }

  if (!options.signal) {
    return apiRequest<PaginatedResponse<Court>>(path)
  }

  return apiRequest<PaginatedResponse<Court>>(path, {
    signal: options.signal,
  })
}

/**
 * Fetches all courts for a club by sequentially following `next` pagination links until null.
 */
export function fetchAllCourts(
  clubSlug: string,
  options: { signal?: AbortSignal } = {},
): Promise<Court[]> {
  return fetchAllPages((nextUrl) =>
    listCourts(clubSlug, { nextUrl, signal: options.signal }),
  )
}


export function createCourt(
  clubSlug: string,
  payload: CourtPayload,
): Promise<Court> {
  return apiRequest<Court>(apiEndpoints.clubs.courts.list(clubSlug), {
    method: 'POST',
    body: payload,
  })
}

export function getCourt(
  clubSlug: string,
  courtId: number | string,
): Promise<Court> {
  return apiRequest<Court>(apiEndpoints.clubs.courts.detail(clubSlug, courtId))
}

export function updateCourt(
  clubSlug: string,
  courtId: number | string,
  payload: CourtPayload,
): Promise<Court> {
  return apiRequest<Court>(
    apiEndpoints.clubs.courts.detail(clubSlug, courtId),
    {
      method: 'PATCH',
      body: payload,
    },
  )
}

/**
 * Lists a Court's images in Backend `position` order (unpaginated).
 *
 * GET /api/v1/clubs/{club_slug}/courts/{court_id}/images/
 */
export function listCourtImages(
  clubSlug: string,
  courtId: number | string,
): Promise<CourtImage[]> {
  return apiRequest<CourtImage[]>(
    apiEndpoints.clubs.courts.images.list(clubSlug, courtId),
  )
}

/**
 * Uploads one image file for a Court as `multipart/form-data`.
 *
 * POST /api/v1/clubs/{club_slug}/courts/{court_id}/images/ with a single
 * `image` field. Backend validates, processes, and stores the file, then
 * returns the new relation with derived public URLs. Court create/update
 * endpoints do not accept images.
 */
export function uploadCourtImage(
  clubSlug: string,
  courtId: number | string,
  image: File,
): Promise<CourtImage> {
  const formData = new FormData()
  formData.append('image', image)

  return apiRequest<CourtImage>(
    apiEndpoints.clubs.courts.images.list(clubSlug, courtId),
    {
      method: 'POST',
      body: formData,
    },
  )
}

/**
 * Detaches one image from a Court.
 *
 * DELETE /api/v1/clubs/{club_slug}/courts/{court_id}/images/{court_image_id}/
 */
export function deleteCourtImage(
  clubSlug: string,
  courtId: number | string,
  courtImageId: number,
): Promise<void> {
  return apiRequest<void>(
    apiEndpoints.clubs.courts.images.detail(clubSlug, courtId, courtImageId),
    { method: 'DELETE' },
  )
}

/**
 * Makes `image` the Court's only image (one Court = one primary image).
 *
 * Reads the current images, uploads the new file, and only after a successful
 * upload detaches the previous images. A failed upload therefore never removes
 * the existing image.
 */
export async function replaceCourtPrimaryImage(
  clubSlug: string,
  courtId: number | string,
  image: File,
): Promise<CourtImage> {
  const previousImages = await listCourtImages(clubSlug, courtId)
  const uploadedImage = await uploadCourtImage(clubSlug, courtId, image)

  for (const previousImage of previousImages) {
    await deleteCourtImage(clubSlug, courtId, previousImage.id)
  }

  return uploadedImage
}

export interface GetCourtMonthlyStatisticsOptions {
  signal?: AbortSignal
}

/**
 * Fetches backend-authoritative monthly statistics for a court.
 *
 * GET /api/v1/clubs/{club_slug}/courts/{court_id}/monthly-statistics/?month=YYYY-MM
 */
export function getCourtMonthlyStatistics(
  clubSlug: string,
  courtId: number | string,
  month: string,
  options: GetCourtMonthlyStatisticsOptions = {},
): Promise<CourtMonthlyStatistics> {
  const basePath = apiEndpoints.clubs.courts.monthlyStatistics(clubSlug, courtId)
  const path = buildPathWithQuery(basePath, { month })

  return apiRequest<CourtMonthlyStatistics>(path, {
    signal: options.signal,
  })
}
