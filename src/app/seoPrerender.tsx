import type { ComponentType } from 'react'
import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { normalizePublicSiteOrigin } from '../core/seo/publicSiteOrigin'
import { buildSeoHeadTags, renderSeoHeadHtml } from '../core/seo/seoHead'
import {
  buildGenericAppFallbackHtml,
  buildRobotsTxt,
  buildSitemapXml,
  injectPrerenderedPage,
} from '../core/seo/seoStaticFiles'
import { AboutPage } from '../features/publicSite/AboutPage/AboutPage'
import { PublicHomePage } from '../features/publicSite/PublicHomePage/PublicHomePage'
import {
  indexablePublicPages,
  type IndexablePublicPath,
} from '../features/publicSite/publicSite.seo'

export interface StaticSeoFile {
  fileName: string
  source: string
}

export interface RenderStaticSeoFilesInput {
  /** Built `index.html` from Vite. */
  template: string
  /** Raw `VITE_PUBLIC_SITE_URL`. */
  siteUrl: string | undefined
}

/** Page component rendered for every indexable public path. */
const prerenderPages: Record<IndexablePublicPath, ComponentType> = {
  '/': PublicHomePage,
  '/about/': AboutPage,
}

function getOutputFileName(path: IndexablePublicPath): string {
  return path === '/' ? 'index.html' : `${path.slice(1)}index.html`
}

/**
 * Build-time entry loaded by `seoBuildPlugin` through Vite SSR.
 *
 * Renders each indexable public page with the same React components the
 * client uses, and returns:
 * - `index.html`: dedicated public discovery head + markup with full static
 *   canonical, robots (index, follow), Open Graph, JSON-LD, and prerendered
 *   HTML for `/`. The Court list renders its loading state here; real Courts
 *   load from the public discovery API in the browser.
 * - `about/index.html`: dedicated About page with complete static SEO head.
 * - `app.html`: clean generic SPA fallback for Nginx / Workbox deep links with
 *   `noindex, nofollow`, empty `#root`, and zero homepage-specific metadata.
 * - `robots.txt` and `sitemap.xml` for the configured public origin.
 */
export function renderStaticSeoFiles({
  template,
  siteUrl,
}: RenderStaticSeoFilesInput): StaticSeoFile[] {
  const origin = normalizePublicSiteOrigin(siteUrl)

  if (!origin) {
    throw new Error(
      'SEO prerender: VITE_PUBLIC_SITE_URL must be an absolute http(s) URL (see .env.production).',
    )
  }

  const pageFiles = indexablePublicPages.map(({ path, seo }): StaticSeoFile => {
    const fileName = getOutputFileName(path)
    const Page = prerenderPages[path]
    const tags = buildSeoHeadTags(seo, {
      origin,
      includeUrlIdentity: true,
    })

    return {
      fileName,
      source: injectPrerenderedPage({
        template,
        path,
        headHtml: renderSeoHeadHtml(seo.title, tags),
        bodyHtml: renderToString(
          <MemoryRouter initialEntries={[path]}>
            <Page />
          </MemoryRouter>,
        ),
      }),
    }
  })

  return [
    ...pageFiles,
    { fileName: 'app.html', source: buildGenericAppFallbackHtml(template) },
    { fileName: 'robots.txt', source: buildRobotsTxt(origin) },
    {
      fileName: 'sitemap.xml',
      source: buildSitemapXml(
        origin,
        indexablePublicPages.map((page) => page.path),
      ),
    },
  ]
}
