import type { NoindexPageSeo } from '../../core/seo/seo.types'

/**
 * SEO for `/public/:clubSlug/courts/:courtId/schedule`.
 *
 * Court schedules stay out of search results: they are date-dependent utility
 * pages reached from public discovery (`/`) or a shared link/QR. They are the
 * Court destination, not the SEO strategy (docs/seo.md, "Court pages").
 */
export const publicScheduleSeo: NoindexPageSeo = {
  robots: 'noindex',
  title: 'جدول مواعيد الملعب | Sloty',
}
