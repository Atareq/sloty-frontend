import { getAccessToken } from '../auth/authStorage'
import { API_BASE_URL } from '../../shared/config/api'

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface ApiRequestOptions {
  method?: HttpMethod
  body?: unknown
  headers?: HeadersInit
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
    return 'انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى.'
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
  const message =
    getBackendErrorMessage(payload) ??
    getFirstFieldErrorMessage(fieldErrors) ??
    getFallbackErrorMessage(response.status, code)

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

/**
 * Centralized typed fetch helper for Sloty API access.
 *
 * The backend is responsible for localized business and validation messages.
 * Frontend Arabic messages are used only when the backend does not provide one
 * or when the request cannot reach the backend.
 */
export async function apiRequest<TResponse>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<TResponse> {
  const token = getAccessToken()
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
      body:
        options.body === undefined
          ? undefined
          : JSON.stringify(options.body),
    })
  } catch (error) {
    throw new ApiClientError(NETWORK_ERROR_MESSAGE, 0, {
      code: 'NETWORK_ERROR',
      raw: error,
    })
  }

  if (!response.ok) {
    throw await createApiClientError(response)
  }

  if (response.status === 204) {
    return undefined as TResponse
  }

  return (await response.json()) as TResponse
}
