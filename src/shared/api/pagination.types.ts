/**
 * Canonical Django REST Framework paginated response structure.
 *
 * DRF list endpoints return this object shape with `count`, `next`, `previous`,
 * and `results`. Frontend collection consumers must explicitly handle `results`
 * and never assume a plain array is returned directly.
 */
export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

