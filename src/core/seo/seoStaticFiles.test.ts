import { describe, expect, it } from 'vitest'
import {
  buildGenericAppFallbackHtml,
  buildPrerenderGuardHtml,
  buildRobotsTxt,
  buildSitemapXml,
  injectPrerenderedPage,
} from './seoStaticFiles'

const ORIGIN = 'https://sloty.example'

const TEMPLATE = `<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <!-- the title element below is replaced -->
    <title>Sloty | سلوتي</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/assets/index.js"></script>
  </body>
</html>`

describe('buildRobotsTxt', () => {
  it('allows crawling and references the absolute sitemap', () => {
    const robots = buildRobotsTxt(ORIGIN)

    expect(robots).toContain('User-agent: *\nAllow: /')
    expect(robots).toContain('Sitemap: https://sloty.example/sitemap.xml')
    expect(robots).not.toMatch(/Disallow:\s*\/assets/)
    expect(robots).not.toMatch(/Disallow:\s*\/\s*$/m)
  })
})

describe('buildSitemapXml', () => {
  it('lists only the given absolute URLs', () => {
    const xml = buildSitemapXml(ORIGIN, ['/', '/about/'])

    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
    expect(xml).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"')
    expect(xml.match(/<loc>/g)).toHaveLength(2)
    expect(xml).toContain('<loc>https://sloty.example/</loc>')
    expect(xml).toContain('<loc>https://sloty.example/about/</loc>')
    expect(xml).not.toContain('lastmod')
  })
})

describe('buildPrerenderGuardHtml', () => {
  function runGuard(path: `/${string}`, pathname: string, standalone = false): boolean {
    document.documentElement.removeAttribute('data-sloty-prerender-hidden')
    window.history.replaceState(null, '', pathname)
    const originalMatchMedia = window.matchMedia
    window.matchMedia = ((query: string) => ({
      matches: standalone && query.includes('standalone'),
    })) as unknown as typeof window.matchMedia
    const script = buildPrerenderGuardHtml(path).match(/<script>([\s\S]*)<\/script>/)?.[1]
    new Function(script ?? '')()
    window.matchMedia = originalMatchMedia
    window.history.replaceState(null, '', '/')
    return document.documentElement.hasAttribute('data-sloty-prerender-hidden')
  }

  it('keeps prerendered markup visible on its own URL, with or without trailing slash', () => {
    expect(runGuard('/', '/')).toBe(false)
    expect(runGuard('/about/', '/about/')).toBe(false)
    expect(runGuard('/about/', '/about')).toBe(false)
  })

  it('hides homepage markup on SPA deep links served from index.html', () => {
    expect(runGuard('/', '/login')).toBe(true)
    expect(runGuard('/', '/schedule')).toBe(true)
    expect(runGuard('/', '/public/club/courts/1/schedule')).toBe(true)
  })

  it('hides prerendered markup in an installed PWA launch', () => {
    expect(runGuard('/', '/', true)).toBe(true)
  })
})

describe('injectPrerenderedPage', () => {
  it('replaces the title with the SEO head and fills #root', () => {
    const html = injectPrerenderedPage({
      template: TEMPLATE,
      path: '/about/',
      headHtml: '<title>About</title>\n    <meta name="description" content="d" data-sloty-seo />',
      bodyHtml: '<h1>About</h1>',
    })

    expect(html.match(/<title>/g)).toHaveLength(1)
    expect(html).toContain('<title>About</title>')
    expect(html).not.toContain('<title>Sloty | سلوتي</title>')
    expect(html).toContain(
      '<div id="root"><div data-sloty-prerender="/about/"><h1>About</h1></div></div>',
    )
    expect(html).toContain('<!-- the title element below is replaced -->')
    expect(html).toContain('<script type="module" src="/assets/index.js"></script>')
  })

  it('fails loudly when the template contract is broken', () => {
    const input = { path: '/' as const, headHtml: '<title>x</title>', bodyHtml: '' }

    expect(() =>
      injectPrerenderedPage({ ...input, template: TEMPLATE.replace('<div id="root"></div>', '') }),
    ).toThrow(/#root|root/)
    expect(() =>
      injectPrerenderedPage({ ...input, template: TEMPLATE.replace('<!-- the title element', '<!-- <title> element') }),
    ).toThrow(/exactly one <title>/)
  })
})

describe('buildGenericAppFallbackHtml', () => {
  it('emits a clean SPA fallback document with noindex and empty #root', () => {
    const html = buildGenericAppFallbackHtml(TEMPLATE)

    expect(html.match(/<title>/g)).toHaveLength(1)
    expect(html).toContain('<title>Sloty | سلوتي</title>')
    expect(html).toContain('<meta name="robots" content="noindex, nofollow" data-sloty-seo />')
    expect(html).toContain('<div id="root"></div>')
    expect(html).not.toContain('data-sloty-prerender')
    expect(html).not.toContain('link rel="canonical"')
    expect(html).not.toContain('name="description"')
    expect(html).not.toContain('property="og:')
    expect(html).not.toContain('application/ld+json')
    expect(html).toContain('<script type="module" src="/assets/index.js"></script>')
  })

  it('fails loudly when the template has missing root or invalid title', () => {
    expect(() =>
      buildGenericAppFallbackHtml(TEMPLATE.replace('<div id="root"></div>', '')),
    ).toThrow(/#root|root/)
    expect(() =>
      buildGenericAppFallbackHtml(TEMPLATE.replace('<title>', '<title>x</title><title>')),
    ).toThrow(/exactly one <title>/)
  })
})

