import { getAccessToken } from '../auth/authStorage'
import { API_BASE_URL } from '../../shared/config/api'

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface ApiRequestOptions {
  method?: HttpMethod
  body?: unknown
  headers?: HeadersInit
}

export class ApiClientError extends Error {
  public readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiClientError'
    this.status = status
  }
}

function getApiUrl(path: string): URL {
  return new URL(path.replace(/^\/+/, ''), API_BASE_URL)
}

/**
 * Centralized typed fetch helper for future Sloty API access.
 *
 * Keep API calls here or in feature-level API modules that depend on this
 * helper. This prevents scattered Authorization header handling and avoids
 * hardcoding production backend URLs before contracts are agreed.
 */
export async function apiRequest<TResponse>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<TResponse> {
  const token = getAccessToken()
  const headers = new Headers(options.headers)

  if (options.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(getApiUrl(path), {
    method: options.method ?? 'GET',
    headers,
    body:
      options.body === undefined ? undefined : JSON.stringify(options.body),
  })

  if (!response.ok) {
    throw new ApiClientError('Sloty API request failed', response.status)
  }

  if (response.status === 204) {
    return undefined as TResponse
  }

  return (await response.json()) as TResponse
}
