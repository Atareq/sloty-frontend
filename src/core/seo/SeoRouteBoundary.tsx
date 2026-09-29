import { useEffect } from 'react'
import { Outlet, useMatches } from 'react-router'
import { getPublicSiteOrigin } from './publicSiteOrigin'
import { applyDocumentSeo } from './seoDocument'
import { resolveRouteSeo } from './seoRoute'

/**
 * Root layout route that owns document SEO for the whole application.
 *
 * It reads `handle.seo` from the matched routes and writes title, robots,
 * canonical, Open Graph, and JSON-LD through `applyDocumentSeo()`. Pages must
 * not set `document.title` or head tags themselves.
 */
export function SeoRouteBoundary() {
  const seo = resolveRouteSeo(useMatches())

  useEffect(() => {
    applyDocumentSeo(document, seo, getPublicSiteOrigin())
  }, [seo])

  return <Outlet />
}
