import type { NoindexPageSeo } from '../../core/seo/seo.types'

/**
 * SEO for `/public/:clubSlug/courts/:courtId/schedule`.
 *
 * Phase 1 keeps shared court schedules out of search results: they are
 * link/QR-shared utility pages with date-dependent availability and numeric
 * court IDs. Indexable Club/Court entity pages are planned separately
 * (docs/seo.md, "Future Club/Court SEO").
 */
export const publicScheduleSeo: NoindexPageSeo = {
  robots: 'noindex',
  title: 'جدول مواعيد الملعب | Sloty',
}
