import type { PaginatedResponse } from './pagination.types'

/**
 * Extracts the item array from a DRF paginated response or a legacy plain array.
 *
 * If the response has `{ results: [...] }`, it returns `results`.
 * If the response is already an array, it returns it directly.
 * For null, undefined, or missing results, it safely returns an empty array.
 */
export function extractResults<T>(
  response: PaginatedResponse<T> | { results: T[] } | T[] | null | undefined,
): T[] {
  if (!response) {
    return []
  }

  if (Array.isArray(response)) {
    return response
  }

  if (
    typeof response === 'object' &&
    'results' in response &&
    Array.isArray((response as { results: unknown }).results)
  ) {
    return (response as PaginatedResponse<T>).results
  }

  return []
}

export function isPaginatedResponse<T>(
  value: unknown,
): value is PaginatedResponse<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'count' in value &&
    typeof (value as { count: unknown }).count === 'number' &&
    'results' in value &&
    Array.isArray((value as { results: unknown }).results)
  )
}

/**
 * Collects all items across paginated responses by following the `next` URL
 * until it is null.
 *
 * Rules:
 * - Does NOT append a custom page_size query parameter.
 * - Each page is fetched sequentially to avoid overloading the server.
 * - The `fetcher` receives the next URL as a raw string on subsequent pages.
 */
export async function fetchAllPages<T>(
  fetcher: (nextUrl?: string) => Promise<PaginatedResponse<T>>,
): Promise<T[]> {
  const all: T[] = []
  let nextUrl: string | null = null

  do {
    const page = await fetcher(nextUrl ?? undefined)
    all.push(...extractResults(page))
    nextUrl = page?.next ?? null
  } while (nextUrl)

  return all
}
