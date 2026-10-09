import type { PaginatedResponse } from '../../shared/api/pagination.types'

/** Maximum number of times a visitor may select in Phase 2/3 discovery. */
export const MAX_DISCOVERY_SELECTED_TIMES = 5

/** Query parameters accepted by `GET public/courts/`. */
export interface PublicCourtDiscoveryParams {
  /** 1-based DRF page number. */
  page: number
}

/**
 * Active Phase 2/3/4 discovery filter criteria sent to Backend search.
 *
 * - `date` is a concrete `YYYY-MM-DD` calendar date when filtering by day/time,
 *   or `null` when filtering by a specific Court only (Phase 4).
 * - `times` contains 0 to 5 24-hour `HH:MM` values; when multiple times are
 *   provided, Backend matches Courts available at ANY selected time (OR).
 * - `courtId` is the stable Backend Court identifier when the visitor chooses
 *   a specific Court in Phase 4.
 */
export interface PublicCourtSearchCriteria {
  /** Concrete calendar date (`YYYY-MM-DD`), or `null` for Court-only search. */
  date: string | null
  /** Zero to five 24-hour time strings (`HH:MM`). */
  times: string[]
  /** Optional Backend Court ID when filtering to a specific Court. */
  courtId?: number | null
}

/** Query parameters accepted by `GET public/courts/search/`. */
export interface PublicCourtSearchParams extends PublicCourtSearchCriteria {
  /** 1-based DRF page number. */
  page: number
}

/** Optional multi-image item shape if Backend supplies multiple Court images. */
export type PublicCourtDiscoveryRawImage =
  | string
  | {
      image_url?: string | null
      url?: string | null
    }

/**
 * One Court item as the Backend public discovery / search endpoint returns it.
 *
 * Only `publicDiscovery.mappers.ts` reads these field names. If the Backend
 * contract changes, adapt this type and the mapper; UI code uses
 * `DiscoveryCourt` and `DiscoveryCourtOption`.
 */
export interface PublicCourtDiscoveryItemResponse {
  court_id: number
  court_name: string
  club_slug: string
  club_name: string
  governorate: string | null
  city: string | null
  address: string | null
  image_url: string | null
  /** Optional multiple Court images if supplied by Backend. */
  images?: readonly PublicCourtDiscoveryRawImage[] | null
  /**
   * Phase 3: subset of the visitor's requested times (`HH:MM`) that are
   * actually available at this Court on the searched date.
   */
  matching_times?: readonly string[] | null
}

/** DRF paginated envelope returned by `GET public/courts/`. */
export type PublicCourtDiscoveryResponse =
  PaginatedResponse<PublicCourtDiscoveryItemResponse>

/** DRF paginated envelope returned by `GET public/courts/search/`. */
export type PublicCourtSearchResponse =
  PaginatedResponse<PublicCourtDiscoveryItemResponse>

/** UI model for one real Court shown on the public discovery page. */
export interface DiscoveryCourt {
  /** Stable list key across pages: `{clubSlug}:{courtId}`. */
  key: string
  courtId: number
  courtName: string
  clubSlug: string
  clubName: string
  /** Real address line from Backend fields, or `null` when none is set. */
  addressLabel: string | null
  /** Primary absolute http(s) image URL from Backend, or `null` when absent. */
  imageUrl: string | null
  /**
   * Optional list of validated absolute http(s) Court image URLs when Backend
   * supplies multiple real images for the Court.
   */
  images?: string[]
  /**
   * Phase 3: sanitized 24-hour (`HH:MM`) matching requested times returned by
   * Backend for this Court. Empty array when not in a time-filtered search.
   */
  matchingTimes: string[]
}

/**
 * Phase 4 UI model for one selectable Court option in the Court filter sheet.
 *
 * Uses stable Backend identity (`key`, `courtId`, `clubSlug`) rather than
 * comparing Courts by display name.
 */
export interface DiscoveryCourtOption {
  /** Stable Court identity across clubs: `{clubSlug}:{courtId}`. */
  key: string
  courtId: number
  courtName: string
  clubSlug: string
  clubName: string
  /** Optional validated primary image URL from Backend, or `null`. */
  imageUrl: string | null
}

/** One mapped page of discovery results. */
export interface DiscoveryCourtPage {
  courts: DiscoveryCourt[]
  totalCount: number
  hasNextPage: boolean
}

/** One mapped page of selectable Court options for the Phase 4 Court selector. */
export interface DiscoveryCourtOptionPage {
  options: DiscoveryCourtOption[]
  totalCount: number
  hasNextPage: boolean
}
