const PLACEHOLDER_ACCESS_TOKEN_KEY = 'sloty.placeholder.access_token'

/**
 * Reads the placeholder frontend access token from session storage.
 *
 * This is temporary client-side auth state for routing experiments only. It is
 * not a backend API contract, JWT strategy, refresh-token flow, or security
 * boundary.
 */
export function getAccessToken(): string | null {
  return sessionStorage.getItem(PLACEHOLDER_ACCESS_TOKEN_KEY)
}

/**
 * Stores a placeholder access token for the current browser tab session.
 *
 * Future real auth should replace this through a documented API module once
 * backend contracts exist.
 */
export function setAccessToken(token: string): void {
  sessionStorage.setItem(PLACEHOLDER_ACCESS_TOKEN_KEY, token)
}

/**
 * Clears the placeholder frontend auth state.
 */
export function clearAccessToken(): void {
  sessionStorage.removeItem(PLACEHOLDER_ACCESS_TOKEN_KEY)
}

/**
 * Returns whether the current browser tab has placeholder auth state.
 */
export function isAuthenticated(): boolean {
  return Boolean(getAccessToken())
}
