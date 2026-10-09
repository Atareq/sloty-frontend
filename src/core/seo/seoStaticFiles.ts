import { buildPublicSiteUrl } from './publicSiteOrigin'
import { SEO_MANAGED_ATTRIBUTE, privateAppSeo } from './seoConfig'
import { escapeHtml, ROBOTS_NOINDEX } from './seoHead'

/** Attribute on the wrapper around prerendered page markup inside `#root`. */
export const PRERENDER_ATTRIBUTE = 'data-sloty-prerender'
/** Attribute the inline guard sets on `<html>` to hide non-matching markup. */
export const PRERENDER_HIDDEN_ATTRIBUTE = 'data-sloty-prerender-hidden'

const TITLE_PATTERN = /<title>[\s\S]*?<\/title>/
const EMPTY_ROOT = '<div id="root"></div>'

/**
 * Produces the generic SPA fallback document (`app.html`).
 *
 * This file is served by Nginx (`try_files $uri $uri/ /app.html;`) and Workbox
 * (`navigateFallback: 'app.html'`) for every private, authenticated, or
 * dynamic SPA route (e.g. `/login`, `/dashboard`, `/schedule`, `/settlements`).
 *
 * It contains:
 * - `<title>Sloty | سلوتي</title>`
 * - `<meta name="robots" content="noindex, nofollow" data-sloty-seo />`
 * - Clean, empty `<div id="root"></div>`
 * - Built Vite scripts and stylesheet links
 *
 * It contains ZERO page-specific metadata: no meta description, no canonical,
 * no Open Graph tags, no JSON-LD schema, and no prerendered page markup.
 */
export function buildGenericAppFallbackHtml(template: string): string {
  if ((template.match(/<title>/g) ?? []).length !== 1) {
    throw new Error(
      'SEO fallback: template must contain exactly one <title> (also not inside comments).',
    )
  }
  if (!template.includes(EMPTY_ROOT)) {
    throw new Error(`SEO fallback: template has no empty ${EMPTY_ROOT}.`)
  }

  const fallbackHead = `<title>${escapeHtml(privateAppSeo.title)}</title>\n    <meta name="robots" content="${ROBOTS_NOINDEX}" ${SEO_MANAGED_ATTRIBUTE} />`

  return template.replace(TITLE_PATTERN, () => fallbackHead)
}

/**
 * Builds `robots.txt`.
 *
 * Everything is crawlable, including JS/CSS needed for rendering. Private
 * application routes are protected by authentication and marked `noindex` by
 * the runtime SEO layer; robots.txt is not an access-control mechanism, and
 * blocking those routes here would stop crawlers from seeing that `noindex`.
 */
export function buildRobotsTxt(origin: string): string {
  return [
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${buildPublicSiteUrl(origin, '/sitemap.xml')}`,
    '',
  ].join('\n')
}

/**
 * Builds `sitemap.xml` from the indexable public page paths only.
 *
 * `lastmod`, `changefreq`, and `priority` are omitted: a build timestamp is
 * not a real content modification date, and Google ignores the other two.
 */
export function buildSitemapXml(
  origin: string,
  paths: readonly `/${string}`[],
): string {
  const urls = paths
    .map(
      (path) =>
        `  <url>\n    <loc>${escapeHtml(buildPublicSiteUrl(origin, path))}</loc>\n  </url>`,
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
}

/** Normalizes a path for comparison: `/about/` and `/about` are equal. */
function normalizePrerenderPath(path: string): string {
  return path.replace(/\/+$/, '') || '/'
}

/**
 * Inline style + script that hide prerendered markup when it does not belong
 * to the current URL.
 *
 * `index.html` is served for every SPA deep link and launched by the installed
 * PWA, so its homepage markup would otherwise flash before React replaces it
 * on `/schedule`, `/login`, or a standalone launch. Crawlers requesting the
 * matching URL still receive and render the full content.
 */
export function buildPrerenderGuardHtml(path: `/${string}`): string {
  const expectedPath = JSON.stringify(normalizePrerenderPath(path))

  return [
    `<style>html[${PRERENDER_HIDDEN_ATTRIBUTE}] [${PRERENDER_ATTRIBUTE}]{display:none!important}</style>`,
    `<script>(function(){try{var p=location.pathname.replace(/\\/+$/,'')||'/';var s=(window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches)||navigator.standalone===true;if(s||p!==${expectedPath}){document.documentElement.setAttribute('${PRERENDER_HIDDEN_ATTRIBUTE}','')}}catch(e){}})();</script>`,
  ].join('\n    ')
}

export interface InjectPrerenderedPageInput {
  /** Built `index.html` emitted by Vite (scripts, styles, manifest link). */
  template: string
  /** Route path the markup was rendered for, e.g. `/` or `/about/`. */
  path: `/${string}`
  /** `<title>` plus SEO head tags from `renderSeoHeadHtml()`. */
  headHtml: string
  /** `renderToString()` output of the page component. */
  bodyHtml: string
}

/**
 * Produces a route-specific HTML document from the built app shell.
 *
 * The template's `<title>` is replaced by the SEO head and the empty `#root`
 * receives the prerendered markup. React's `createRoot()` replaces that markup
 * on start-up, so the client app behaves exactly as before.
 */
export function injectPrerenderedPage({
  template,
  path,
  headHtml,
  bodyHtml,
}: InjectPrerenderedPageInput): string {
  if ((template.match(/<title>/g) ?? []).length !== 1) {
    throw new Error(
      'SEO prerender: index.html template must contain exactly one <title> (also not inside comments).',
    )
  }
  if (!template.includes(EMPTY_ROOT)) {
    throw new Error(`SEO prerender: index.html template has no empty ${EMPTY_ROOT}.`)
  }

  const head = `${buildPrerenderGuardHtml(path)}\n    ${headHtml}`
  const root = `<div id="root"><div ${PRERENDER_ATTRIBUTE}="${escapeHtml(path)}">${bodyHtml}</div></div>`

  return template.replace(TITLE_PATTERN, () => head).replace(EMPTY_ROOT, () => root)
}
