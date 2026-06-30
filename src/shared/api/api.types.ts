/**
 * Minimal paginated response shape for future list endpoints.
 *
 * This intentionally stays small until real endpoint integrations need more
 * fields from the backend contract.
 */
export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}
