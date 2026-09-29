import type { NoindexPageSeo } from './seo.types'

/** Brand names used consistently across metadata and structured data. */
export const SEO_SITE_NAME = 'Sloty'
export const SEO_SITE_ARABIC_NAME = 'سلوتي'

/** Open Graph locale for Arabic-first Egyptian content. */
export const SEO_OPEN_GRAPH_LOCALE = 'ar_EG'

/**
 * Existing square brand icon reused as the social preview image.
 *
 * It is a real file in `public/icons/` (also used by the PWA manifest).
 */
export const SEO_SOCIAL_IMAGE_PATH = '/icons/sloty-512x512.png'
export const SEO_SOCIAL_IMAGE_ALT = 'شعار Sloty | سلوتي'

/** Marker attribute on every head tag owned by the SEO layer. */
export const SEO_MANAGED_ATTRIBUTE = 'data-sloty-seo'

/**
 * Default SEO for every route that does not declare its own `handle.seo`.
 *
 * Authenticated workspaces, login, and other application routes fall back to
 * this `noindex` policy, so a new private route is never indexable by accident.
 */
export const privateAppSeo: NoindexPageSeo = {
  robots: 'noindex',
  title: `${SEO_SITE_NAME} | ${SEO_SITE_ARABIC_NAME}`,
}
