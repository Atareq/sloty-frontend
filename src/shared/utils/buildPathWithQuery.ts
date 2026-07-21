export type QueryParamValue = string | number | boolean | null | undefined

function isValidQueryParamValue(
  value: QueryParamValue,
): value is string | number | boolean {
  return value !== null && value !== undefined && value !== ''
}

/**
 * Builds app navigation paths with encoded query parameters.
 *
 * It intentionally preserves `false` and `0` because Summary cards use those
 * values to express real backend filters.
 */
export function buildPathWithQuery(
  path: string,
  query: Record<string, QueryParamValue>,
): string {
  const searchParams = new URLSearchParams()

  Object.entries(query).forEach(([key, value]) => {
    if (!isValidQueryParamValue(value)) {
      return
    }

    searchParams.set(key, String(value))
  })

  const queryString = searchParams.toString()

  return queryString ? `${path}?${queryString}` : path
}
