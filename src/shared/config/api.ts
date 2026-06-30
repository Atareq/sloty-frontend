const DEFAULT_API_BASE_URL = 'http://127.0.0.1:8000/api/v1/'

function ensureTrailingSlash(url: string): string {
  return url.endsWith('/') ? url : `${url}/`
}

/**
 * Single frontend source of truth for the Sloty API base URL.
 *
 * Vite env can override this for deployments, while local development falls
 * back to the expected Django API path.
 */
export const API_BASE_URL = ensureTrailingSlash(
  import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL,
)
