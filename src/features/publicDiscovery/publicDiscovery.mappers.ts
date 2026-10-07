import type {
  DiscoveryCourt,
  DiscoveryCourtOption,
  DiscoveryCourtOptionPage,
  DiscoveryCourtPage,
  PublicCourtDiscoveryItemResponse,
  PublicCourtDiscoveryRawImage,
  PublicCourtDiscoveryResponse,
} from './publicDiscovery.types'

const VALID_TIME_24H_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/

function cleanText(value: string | null | undefined): string {
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * Accepts only absolute http(s) image URLs returned by Backend.
 *
 * Anything else (missing, relative, or another scheme) becomes `null`, so the
 * card renders its neutral placeholder instead of a broken or unsafe source.
 */
function getSafeImageUrl(value: string | null | undefined): string | null {
  const imageUrl = cleanText(value)

  if (!imageUrl) {
    return null
  }

  try {
    const { protocol } = new URL(imageUrl)

    return protocol === 'https:' || protocol === 'http:' ? imageUrl : null
  } catch {
    return null
  }
}

function extractRawImageCandidate(
  entry: PublicCourtDiscoveryRawImage | null | undefined,
): string | null {
  if (typeof entry === 'string') {
    return getSafeImageUrl(entry)
  }

  if (entry && typeof entry === 'object') {
    return getSafeImageUrl(entry.image_url ?? entry.url)
  }

  return null
}

/**
 * Collects unique, valid http(s) Court image URLs when Backend supplies
 * `images` alongside or instead of `image_url`.
 */
function buildSafeImageList(
  primaryImageUrl: string | null,
  rawImages: readonly PublicCourtDiscoveryRawImage[] | null | undefined,
): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  if (primaryImageUrl) {
    seen.add(primaryImageUrl)
    result.push(primaryImageUrl)
  }

  if (Array.isArray(rawImages)) {
    for (const rawEntry of rawImages) {
      const safeUrl = extractRawImageCandidate(rawEntry)

      if (safeUrl && !seen.has(safeUrl)) {
        seen.add(safeUrl)
        result.push(safeUrl)
      }
    }
  }

  return result
}

/**
 * Normalizes one Backend matching time into `HH:MM` (24-hour) format, or
 * returns `null` if the value is not a valid time string.
 */
function normalizeMatchingTime(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  const timePart = trimmed.includes('T') ? (trimmed.split('T')[1] ?? '') : trimmed
  const candidate = timePart.slice(0, 5)

  return VALID_TIME_24H_PATTERN.test(candidate) ? candidate : null
}

/**
 * Sanitizes and deduplicates Backend `matching_times` at the mapper boundary.
 *
 * Only reads `matching_times`; never inspects unrelated availability fields or
 * computes availability locally.
 */
export function mapMatchingTimes(
  rawMatchingTimes: readonly unknown[] | null | undefined,
): string[] {
  if (!Array.isArray(rawMatchingTimes)) {
    return []
  }

  const seen = new Set<string>()
  const normalized: string[] = []

  for (const item of rawMatchingTimes) {
    const validTime = normalizeMatchingTime(item)

    if (validTime && !seen.has(validTime)) {
      seen.add(validTime)
      normalized.push(validTime)
    }
  }

  return normalized
}

/**
 * Builds the visible address line from real Backend location fields.
 *
 * The street address comes first. City and governorate are appended only
 * when the address does not already mention them, so a place name is never
 * repeated on a card.
 */
function buildAddressLabel(item: PublicCourtDiscoveryItemResponse): string | null {
  const parts: string[] = []

  for (const part of [item.address, item.city, item.governorate]) {
    const text = cleanText(part)

    if (text && !parts.some((existing) => existing.includes(text))) {
      parts.push(text)
    }
  }

  return parts.length > 0 ? parts.join('، ') : null
}

function isLinkableItem(item: PublicCourtDiscoveryItemResponse): boolean {
  return (
    Number.isInteger(item.court_id) &&
    item.court_id > 0 &&
    cleanText(item.club_slug) !== '' &&
    cleanText(item.court_name) !== ''
  )
}

/** Maps one Backend discovery or search item to the UI Court model. */
export function mapPublicCourtDiscoveryItem(
  item: PublicCourtDiscoveryItemResponse,
): DiscoveryCourt {
  const clubSlug = cleanText(item.club_slug)
  const primaryImageUrl = getSafeImageUrl(item.image_url)
  const allSafeImages = buildSafeImageList(primaryImageUrl, item.images)
  const resolvedPrimaryImage = allSafeImages[0] ?? null

  const mapped: DiscoveryCourt = {
    key: `${clubSlug}:${item.court_id}`,
    courtId: item.court_id,
    courtName: cleanText(item.court_name),
    clubSlug,
    clubName: cleanText(item.club_name),
    addressLabel: buildAddressLabel(item),
    imageUrl: resolvedPrimaryImage,
    matchingTimes: mapMatchingTimes(item.matching_times),
  }

  if (allSafeImages.length > 1) {
    mapped.images = allSafeImages
  }

  return mapped
}

/** Maps a `DiscoveryCourt` model to a Phase 4 `DiscoveryCourtOption`. */
export function mapDiscoveryCourtToOption(
  court: DiscoveryCourt,
): DiscoveryCourtOption {
  return {
    key: court.key,
    courtId: court.courtId,
    courtName: court.courtName,
    clubSlug: court.clubSlug,
    clubName: court.clubName,
    imageUrl: court.imageUrl,
  }
}

/** Maps a `DiscoveryCourtPage` to a Phase 4 `DiscoveryCourtOptionPage`. */
export function mapDiscoveryCourtPageToOptionPage(
  page: DiscoveryCourtPage,
): DiscoveryCourtOptionPage {
  return {
    options: page.courts.map(mapDiscoveryCourtToOption),
    totalCount: page.totalCount,
    hasNextPage: page.hasNextPage,
  }
}

/**
 * Maps a Backend discovery or search page to the UI page model.
 *
 * Items without a Court id, Club slug, or Court name are dropped: they cannot
 * link to a public schedule, and the page never fills gaps with invented data.
 */
export function mapPublicCourtDiscoveryResponse(
  response: PublicCourtDiscoveryResponse,
): DiscoveryCourtPage {
  const results = Array.isArray(response.results) ? response.results : []

  return {
    courts: results.filter(isLinkableItem).map(mapPublicCourtDiscoveryItem),
    totalCount: response.count,
    hasNextPage: Boolean(response.next),
  }
}
