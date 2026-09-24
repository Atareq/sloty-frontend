import { apiEndpoints } from '../../shared/api/apiEndpoints'
import { sessionCopy } from '../../shared/copy/appCopy'
import { API_BASE_URL } from '../../shared/config/api'
import {
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
  markSessionExpiredNotice,
  setAccessToken,
} from '../auth/authStorage'

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface ApiRequestOptions {
  method?: HttpMethod
  body?: unknown
  headers?: HeadersInit
  signal?: AbortSignal
  skipAuthRefresh?: boolean
  omitAuth?: boolean
  retried?: boolean
}

export interface ApiFieldError {
  code: string
  message: string
}

export interface ApiErrorResponse {
  success: false
  code: string
  message: string
  field_errors?: Record<string, ApiFieldError[]>
  details?: Record<string, unknown>
  request_id?: string
}

export interface ApiClientErrorOptions {
  code?: string
  fieldErrors?: Record<string, ApiFieldError[]>
  details?: Record<string, unknown>
  requestId?: string
  raw?: unknown
}

export const DEFAULT_API_ERROR_MESSAGE =
  'حدث خطأ غير متوقع. حاول مرة أخرى.'

export const SESSION_EXPIRED_MESSAGE = sessionCopy.expired

const VALIDATION_ERROR_FALLBACK_MESSAGE =
  'يرجى مراجعة البيانات المدخلة.'

const NETWORK_ERROR_MESSAGE =
  'تعذر الاتصال بالخادم. تأكد من اتصال الإنترنت.'

export class ApiClientError extends Error {
  public readonly status: number
  public readonly code?: string
  public readonly fieldErrors?: Record<string, ApiFieldError[]>
  public readonly details?: Record<string, unknown>
  public readonly requestId?: string
  public readonly raw?: unknown

  constructor(
    message: string,
    status: number,
    options: ApiClientErrorOptions = {},
  ) {
    super(message)

    this.name = 'ApiClientError'
    this.status = status
    this.code = options.code
    this.fieldErrors = options.fieldErrors
    this.details = options.details
    this.requestId = options.requestId
    this.raw = options.raw
  }
}

function getApiUrl(path: string): URL {
  return new URL(path.replace(/^\/+/, ''), API_BASE_URL)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  )
}

function getFallbackErrorMessage(
  status: number,
  code?: string,
): string {
  if (code === 'NETWORK_ERROR') {
    return NETWORK_ERROR_MESSAGE
  }

  if (status === 400 || code === 'VALIDATION_ERROR') {
    return VALIDATION_ERROR_FALLBACK_MESSAGE
  }

  if (status === 401 || code === 'UNAUTHORIZED') {
    return SESSION_EXPIRED_MESSAGE
  }

  if (status === 403 || code === 'FORBIDDEN') {
    return 'ليس لديك صلاحية لهذا الإجراء.'
  }

  if (status === 404 || code === 'NOT_FOUND') {
    return 'العنصر المطلوب غير موجود.'
  }

  if (status === 409 || code === 'CONFLICT') {
    return 'حدث تعارض في البيانات. من فضلك حدّث الصفحة وحاول مرة أخرى.'
  }

  if (status >= 500) {
    return 'حدث خطأ في الخادم. حاول مرة أخرى لاحقاً.'
  }

  return DEFAULT_API_ERROR_MESSAGE
}

function looksLikeRawTokenMessage(message: string): boolean {
  const normalized = message.toLowerCase()

  return (
    normalized.includes('invalid token') ||
    normalized.includes('token is invalid') ||
    normalized.includes('token not valid') ||
    normalized.includes('given token not valid')
  )
}

function getBackendErrorMessage(
  payload: unknown,
): string | undefined {
  if (!isRecord(payload)) {
    return undefined
  }

  if (typeof payload.message === 'string') {
    const message = payload.message.trim()

    if (message) {
      return message
    }
  }

  // Compatibility with standard DRF errors that return:
  // { "detail": "Localized error message" }
  if (typeof payload.detail === 'string') {
    const detail = payload.detail.trim()

    if (detail) {
      return detail
    }
  }

  return undefined
}

function normalizeFieldErrors(
  value: unknown,
): Record<string, ApiFieldError[]> | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  const normalized: Record<string, ApiFieldError[]> = {}

  for (const [fieldName, errors] of Object.entries(value)) {
    if (!Array.isArray(errors)) {
      continue
    }

    const fieldErrors = errors.filter(isRecord).flatMap((error) => {
      const code = error.code
      const message = error.message

      if (
        typeof code !== 'string' ||
        typeof message !== 'string'
      ) {
        return []
      }

      const cleanCode = code.trim()
      const cleanMessage = message.trim()

      if (!cleanCode || !cleanMessage) {
        return []
      }

      return [
        {
          code: cleanCode,
          message: cleanMessage,
        },
      ]
    })

    if (fieldErrors.length > 0) {
      normalized[fieldName] = fieldErrors
    }
  }

  return Object.keys(normalized).length > 0
    ? normalized
    : undefined
}

function getFirstFieldErrorMessage(
  fieldErrors?: Record<string, ApiFieldError[]>,
): string | undefined {
  if (!fieldErrors) {
    return undefined
  }

  for (const errors of Object.values(fieldErrors)) {
    const firstError = errors[0]

    if (firstError?.message) {
      return firstError.message
    }
  }

  return undefined
}

function normalizeDetails(
  value: unknown,
): Record<string, unknown> | undefined {
  return isRecord(value) ? value : undefined
}

async function parseErrorPayload(
  response: Response,
): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return null
  }
}

async function createApiClientError(
  response: Response,
): Promise<ApiClientError> {
  const payload = await parseErrorPayload(response)

  const code =
    isRecord(payload) && typeof payload.code === 'string'
      ? payload.code.trim() || undefined
      : undefined

  const fieldErrors = isRecord(payload)
    ? normalizeFieldErrors(payload.field_errors)
    : undefined
  const requestId =
    isRecord(payload) && typeof payload.request_id === 'string'
      ? payload.request_id.trim() || undefined
      : response.headers.get('X-Request-ID')?.trim() || undefined

  /*
   * Error-message priority:
   * 1. Localized backend top-level message.
   * 2. Localized backend DRF detail.
   * 3. First localized field error.
   * 4. Frontend fallback.
   */
  const rawMessage =
    getBackendErrorMessage(payload) ??
    getFirstFieldErrorMessage(fieldErrors) ??
    getFallbackErrorMessage(response.status, code)
  const message =
    response.status === 401 && looksLikeRawTokenMessage(rawMessage)
      ? SESSION_EXPIRED_MESSAGE
      : rawMessage

  return new ApiClientError(message, response.status, {
    code,
    fieldErrors,
    details: isRecord(payload)
      ? normalizeDetails(payload.details)
      : undefined,
    requestId,
    raw: payload,
  })
}

function isAuthTokenPath(path: string): boolean {
  return (
    path === apiEndpoints.auth.token ||
    path === apiEndpoints.auth.refresh ||
    path === apiEndpoints.auth.passwordChange
  )
}

export type RefreshResult =
  | { status: 'success'; accessToken: string }
  | { status: 'network_error'; error: unknown }
  | { status: 'auth_failed'; code?: string }
  | { status: 'aborted' }

type AccessTokenListener = (token: string) => void
type SessionExpiredListener = (code?: string) => void

let accessTokenListeners: AccessTokenListener[] = []
let sessionExpiredListeners: SessionExpiredListener[] = []
let refreshInFlight: Promise<RefreshResult> | null = null
let sessionGeneration = 0

/**
 * Invalidates any in-flight token refresh so a late network response
 * cannot resurrect a logged-out session.
 */
export function invalidateAuthSession(): void {
  sessionGeneration += 1
  refreshInFlight = null
}

/**
 * Lets AuthProvider keep React session state aligned with a silent refresh.
 */
export function subscribeAccessToken(
  listener: AccessTokenListener,
): () => void {
  accessTokenListeners = [...accessTokenListeners, listener]

  return () => {
    accessTokenListeners = accessTokenListeners.filter(
      (currentListener) => currentListener !== listener,
    )
  }
}

/**
 * Lets AuthProvider clear the session after a failed refresh.
 * Lets AuthProvider clear the session after a failed refresh or unrecoverable auth error.
 */
export function subscribeSessionExpired(
  listener: SessionExpiredListener,
): () => void {
  sessionExpiredListeners = [...sessionExpiredListeners, listener]

  return () => {
    sessionExpiredListeners = sessionExpiredListeners.filter(
      (currentListener) => currentListener !== listener,
    )
  }
}

function notifyAccessToken(token: string): void {
  accessTokenListeners.forEach((listener) => listener(token))
}

function failExpiredSession(code?: string): void {
  clearAuthTokens()
  markSessionExpiredNotice()
  sessionExpiredListeners.forEach((listener) => listener(code))
}

/**
 * Performs a single-flight silent refresh using the stored refresh token.
 *
 * Concurrent calls join the same in-flight refresh promise.
 * On success, the new access token is persisted and listeners are notified.
 * On terminal 401 errors, tokens are cleared and the session is marked expired.
 * On transport/network failures, tokens are NOT cleared and auth state is preserved.
 */
export async function refreshSession(): Promise<RefreshResult> {
  if (refreshInFlight) {
    return refreshInFlight
  }

  const initialGeneration = sessionGeneration
  const refreshToken = getRefreshToken()

  if (!refreshToken) {
    return { status: 'auth_failed', code: 'TOKEN_NOT_VALID' }
  }

  refreshInFlight = (async (): Promise<RefreshResult> => {
    try {
      const response = await fetch(getApiUrl(apiEndpoints.auth.refresh), {
        method: 'POST',
        headers: {
          'Accept-Language': 'ar',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh: refreshToken }),
      })

      if (sessionGeneration !== initialGeneration) {
        return { status: 'aborted' }
      }

      if (!response.ok) {
        let code: string | undefined
        try {
          const payload: unknown = await response.json()
          if (isRecord(payload) && typeof payload.code === 'string') {
            code = payload.code.trim() || undefined
          }
        } catch {
          // ignore json parse error
        }

        if (response.status === 401) {
          clearAuthTokens()
          failExpiredSession(code)
          return { status: 'auth_failed', code }
        }

        return { status: 'auth_failed', code }
      }

      const payload: unknown = await response.json()

      if (sessionGeneration !== initialGeneration) {
        return { status: 'aborted' }
      }

      if (
        !isRecord(payload) ||
        typeof payload.access !== 'string' ||
        !payload.access.trim()
      ) {
        return { status: 'auth_failed' }
      }

      const accessToken = payload.access.trim()
      setAccessToken(accessToken)
      notifyAccessToken(accessToken)
      return { status: 'success', accessToken }
    } catch (networkError) {
      if (sessionGeneration !== initialGeneration) {
        return { status: 'aborted' }
      }

      // Transport / network failure (offline, timeout, DNS, connection refused).
      // DO NOT logout! DO NOT clear refresh token! Preserve local auth / session state.
      return { status: 'network_error', error: networkError }
    } finally {
      refreshInFlight = null
    }
  })()

  return refreshInFlight
}

/**
 * Backward-compatible helper returning the refreshed access token string or null.
 */
export async function refreshAccessTokenOnce(): Promise<string | null> {
  const result = await refreshSession()
  return result.status === 'success' ? result.accessToken : null
}

/**
 * Test-only reset for in-flight refresh state and session generation.
 */
export function resetSilentRefreshForTests(): void {
  refreshInFlight = null
  sessionGeneration = 0
}

/**
 * Centralized typed fetch helper for Sloty API access.
 *
 * The backend is responsible for localized business and validation messages.
 * Frontend Arabic messages are used only when the backend does not provide one
 * or when the request cannot reach the backend.
 *
 * Expired access tokens returning 401 SESSION_EXPIRED are silently refreshed once,
 * with concurrent expired requests sharing a single in-flight refresh request.
 */
export async function apiRequest<TResponse>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<TResponse> {
  const requestGeneration = sessionGeneration
  const isAuthExcluded =
    options.omitAuth || options.skipAuthRefresh || isAuthTokenPath(path)

  if (!isAuthExcluded) {
    // If a refresh is already in-flight, wait for it so we don't fire with an expired token
    if (refreshInFlight) {
      const refreshResult = await refreshInFlight
      if (
        refreshResult.status === 'auth_failed' ||
        refreshResult.status === 'aborted'
      ) {
        throw new ApiClientError(SESSION_EXPIRED_MESSAGE, 401, {
          code:
            refreshResult.status === 'auth_failed'
              ? (refreshResult.code ?? 'UNAUTHORIZED')
              : 'UNAUTHORIZED',
        })
      }
    }

    if (sessionGeneration !== requestGeneration) {
      throw new ApiClientError(SESSION_EXPIRED_MESSAGE, 401, {
        code: 'UNAUTHORIZED',
      })
    }
  }

  const token = options.omitAuth ? null : getAccessToken()
  const headers = new Headers(options.headers)

  if (!headers.has('Accept-Language')) {
    headers.set('Accept-Language', 'ar')
  }

  if (
    options.body !== undefined &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json')
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  let response: Response

  try {
    response = await fetch(getApiUrl(path), {
      method: options.method ?? 'GET',
      headers,
      signal: options.signal,
      body:
        options.body === undefined
          ? undefined
          : JSON.stringify(options.body),
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error
    }

    throw new ApiClientError(NETWORK_ERROR_MESSAGE, 0, {
      code: 'NETWORK_ERROR',
      raw: error,
    })
  }

  if (!isAuthExcluded && sessionGeneration !== requestGeneration) {
    throw new ApiClientError(SESSION_EXPIRED_MESSAGE, 401, {
      code: 'UNAUTHORIZED',
    })
  }

  if (!response.ok) {
    const error = await createApiClientError(response)

    // Check for 401 authentication handling
    if (response.status === 401) {
      // 1. Recoverable access-token expiry: ONLY 401 SESSION_EXPIRED triggers refresh
      if (
        error.code === 'SESSION_EXPIRED' &&
        !options.retried &&
        !isAuthExcluded &&
        Boolean(getRefreshToken())
      ) {
        const refreshResult = await refreshSession()

        if (refreshResult.status === 'success') {
          if (sessionGeneration !== requestGeneration) {
            throw new ApiClientError(SESSION_EXPIRED_MESSAGE, 401, {
              code: 'UNAUTHORIZED',
            })
          }
          return apiRequest<TResponse>(path, {
            ...options,
            retried: true,
          })
        }

        if (refreshResult.status === 'network_error') {
          // Transport / network failure during refresh: preserve auth, throw network error
          throw new ApiClientError(NETWORK_ERROR_MESSAGE, 0, {
            code: 'NETWORK_ERROR',
            raw: refreshResult.error,
          })
        }

        // Terminal auth failure during refresh (or aborted)
        const failureCode =
          refreshResult.status === 'auth_failed'
            ? refreshResult.code ?? 'UNAUTHORIZED'
            : 'UNAUTHORIZED'
        throw new ApiClientError(SESSION_EXPIRED_MESSAGE, 401, {
          code: failureCode,
        })
      }

      // 2. Unrecoverable auth conditions (or already retried 401):
      // TOKEN_NOT_VALID, PASSWORD_CHANGED, USER_INACTIVE, USER_DELETED, or retried 401
      if (!isAuthTokenPath(path) && !options.omitAuth) {
        failExpiredSession(error.code)
      }

      throw error
    }

    // 403 CLUB_ACCESS_REVOKED is authorization failure, not authentication failure.
    // It preserves global auth and does not clear tokens.

    throw error
  }

  if (response.status === 204) {
    return undefined as TResponse
  }

  return (await response.json()) as TResponse
}
