/**
 * Normalizes the configured public site URL into a bare origin.
 *
 * Returns `null` for missing or non-HTTP(S) values so callers omit absolute
 * URL tags instead of emitting a wrong host. Paths, queries, and trailing
 * slashes are dropped: `https://sloty.example/` → `https://sloty.example`.
 */
export function normalizePublicSiteOrigin(
  rawValue: string | undefined | null,
): string | null {
  const trimmedValue = rawValue?.trim()

  if (!trimmedValue) {
    return null
  }

  try {
    const url = new URL(trimmedValue)

    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return null
    }

    return url.origin
  } catch {
    return null
  }
}

/**
 * Single runtime source of truth for Sloty's canonical public origin.
 *
 * The value comes from `VITE_PUBLIC_SITE_URL` (committed in `.env.production`)
 * and is compiled in at build time. It is never derived from
 * `window.location` or request headers, so canonical URLs cannot be steered
 * by the host a visitor happened to use.
 */
export function getPublicSiteOrigin(): string | null {
  return normalizePublicSiteOrigin(import.meta.env.VITE_PUBLIC_SITE_URL)
}

/** Joins the canonical origin with a root-relative path. */
export function buildPublicSiteUrl(origin: string, path: `/${string}`): string {
  return `${origin}${path}`
}
