import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { renderStaticSeoFiles, type StaticSeoFile } from '../../src/app/seoPrerender'

const SITE_URL = 'https://sloty.baronlearning.com/'
const TEMPLATE = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf8')

describe('SPA fallback route contract (Nginx & Crawler safety)', () => {
  const rendered = new Map(
    renderStaticSeoFiles({ template: TEMPLATE, siteUrl: SITE_URL }).map(
      (file: StaticSeoFile) => [file.fileName, file.source],
    ),
  )

  /**
   * Simulates Nginx `try_files $uri $uri/ /app.html;` with `index index.html;`.
   */
  function resolveNginxRoute(urlPath: string): { fileName: string; content: string } {
    const normalized = urlPath.replace(/^\/+/, '')

    // 1. $uri (exact static file)
    if (normalized && rendered.has(normalized)) {
      return { fileName: normalized, content: rendered.get(normalized)! }
    }

    // 2. $uri/ (directory containing index.html)
    const directoryIndex = normalized
      ? `${normalized.replace(/\/+$/, '')}/index.html`
      : 'index.html'
    if (rendered.has(directoryIndex)) {
      return { fileName: directoryIndex, content: rendered.get(directoryIndex)! }
    }

    // 3. Fallback: /app.html
    return { fileName: 'app.html', content: rendered.get('app.html')! }
  }

  function parseHtml(html: string): Document {
    return new DOMParser().parseFromString(html, 'text/html')
  }

  it('serves dedicated indexable prerendered HTML for public pages', () => {
    // 1. Homepage /
    const home = resolveNginxRoute('/')
    expect(home.fileName).toBe('index.html')
    const homeDoc = parseHtml(home.content)
    expect(
      homeDoc.querySelector('meta[name="robots"]')?.getAttribute('content'),
    ).toBe('index, follow')
    expect(
      homeDoc.querySelector('link[rel="canonical"]')?.getAttribute('href'),
    ).toBe('https://sloty.baronlearning.com/')
    expect(
      homeDoc.querySelector('meta[property="og:url"]')?.getAttribute('content'),
    ).toBe('https://sloty.baronlearning.com/')
    expect(homeDoc.querySelector('meta[name="description"]')).not.toBeNull()
    expect(
      homeDoc.querySelector('script[type="application/ld+json"]'),
    ).not.toBeNull()
    expect(
      homeDoc.querySelector('#root > [data-sloty-prerender="/"]'),
    ).not.toBeNull()

    // 2. About page /about/
    const about = resolveNginxRoute('/about/')
    expect(about.fileName).toBe('about/index.html')
    const aboutDoc = parseHtml(about.content)
    expect(
      aboutDoc.querySelector('meta[name="robots"]')?.getAttribute('content'),
    ).toBe('index, follow')
    expect(
      aboutDoc.querySelector('link[rel="canonical"]')?.getAttribute('href'),
    ).toBe('https://sloty.baronlearning.com/about/')
    expect(
      aboutDoc.querySelector('#root > [data-sloty-prerender="/about/"]'),
    ).not.toBeNull()
  })

  const privateSpaRoutes = [
    '/login',
    '/select-club',
    '/schedule',
    '/dashboard',
    '/bookings',
    '/transactions',
    '/settlements',
    '/settlements/summary',
    '/settings',
    '/settings/users',
    '/audit-logs',
    '/public/al-ahly/courts/1/schedule',
  ]

  it.each(privateSpaRoutes)(
    'serves clean noindex app.html with zero homepage metadata for private route: %s',
    (route) => {
      const resolved = resolveNginxRoute(route)
      expect(resolved.fileName).toBe('app.html')

      const doc = parseHtml(resolved.content)

      // 1. Robots must be explicitly noindex, nofollow
      expect(
        doc.querySelector('meta[name="robots"]')?.getAttribute('content'),
      ).toBe('noindex, nofollow')

      // 2. Must not have any canonical pointing to homepage or anywhere else
      expect(doc.querySelector('link[rel="canonical"]')).toBeNull()

      // 3. Must not have any homepage description or Open Graph tags
      expect(doc.querySelector('meta[name="description"]')).toBeNull()
      expect(doc.querySelector('meta[property^="og:"]')).toBeNull()
      expect(doc.querySelector('meta[name^="twitter:"]')).toBeNull()

      // 4. Must not have any JSON-LD structured data
      expect(doc.querySelector('script[type="application/ld+json"]')).toBeNull()

      // 5. Must have empty root (no prerendered HTML flash or crawler leak)
      expect(doc.querySelector('#root')?.innerHTML).toBe('')
      expect(doc.querySelector('[data-sloty-prerender]')).toBeNull()

      // 6. Generic brand title only
      expect(doc.title).toBe('Sloty | سلوتي')

      // 7. Core client script bundle must be present to boot React
      expect(
        doc.querySelector('script[type="module"][src="/src/main.tsx"]'),
      ).not.toBeNull()
    },
  )
})
