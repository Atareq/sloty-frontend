const ACCESS_TOKEN_STORAGE_KEY = 'sloty.auth.access_token'
const REFRESH_TOKEN_STORAGE_KEY = 'sloty.auth.refresh_token'
const SESSION_EXPIRED_NOTICE_KEY = 'sloty.auth.session_expired_notice'

const SESSION_EXPIRED_NOTICE =
  'انتهت الجلسة. سجّل دخولك تاني علشان تكمل.'

/**
 * Reads the current access token from session storage.
 *
 * Tokens are stored in one helper so components never talk directly to storage
 * or duplicate token key names.
 */
export function getAccessToken(): string | null {
  return sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)
}

/**
 * Reads the optional refresh token from session storage.
 */
export function getRefreshToken(): string | null {
  return sessionStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)
}

/**
 * Stores the current access token for the browser tab session.
 */
export function setAccessToken(token: string): void {
  sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token)
}

/**
 * Stores or clears the optional refresh token.
 */
export function setRefreshToken(token?: string): void {
  if (token) {
    sessionStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, token)
    return
  }

  sessionStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY)
}

/**
 * Clears all frontend auth token state.
 */
export function clearAuthTokens(): void {
  sessionStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY)
  sessionStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY)
}

/**
 * Stores the Arabic session-expired notice for the login screen.
 */
export function markSessionExpiredNotice(): void {
  sessionStorage.setItem(SESSION_EXPIRED_NOTICE_KEY, SESSION_EXPIRED_NOTICE)
}

/**
 * Reads and clears the session-expired notice after redirecting to login.
 */
export function consumeSessionExpiredNotice(): string | null {
  const notice = sessionStorage.getItem(SESSION_EXPIRED_NOTICE_KEY)

  sessionStorage.removeItem(SESSION_EXPIRED_NOTICE_KEY)

  return notice
}

/**
 * Backward-compatible alias for tests and older imports.
 */
export const clearAccessToken = clearAuthTokens
