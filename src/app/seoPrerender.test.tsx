import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { renderStaticSeoFiles, type StaticSeoFile } from './seoPrerender'

const SITE_URL = 'https://sloty.baronlearning.com/'
/** Real source template: guards the index.html ⇄ prerender contract. */
const TEMPLATE = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf8')

function renderFiles(): Map<string, string> {
  return new Map(
    renderStaticSeoFiles({ template: TEMPLATE, siteUrl: SITE_URL }).map(
      (file: StaticSeoFile) => [file.fileName, file.source],
    ),
  )
}

function parse(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html')
}

function content(doc: Document, selector: string): string | null {
  return doc.querySelector(selector)?.getAttribute('content') ?? null
}

describe('renderStaticSeoFiles', () => {
  it('emits only SEO files and never touches PWA or release artifacts', () => {
    expect([...renderFiles().keys()].sort()).toEqual([
      'about/index.html',
      'app.html',
      'index.html',
      'robots.txt',
      'sitemap.xml',
    ])
  })

  it('prerenders the public discovery identity and Courts section into index.html', () => {
    const doc = parse(renderFiles().get('index.html') ?? '')
    const text = doc.body.textContent ?? ''

    expect(doc.title).toBe('Sloty | سلوتي لحجز وإدارة ملاعب كرة القدم')
    expect(content(doc, 'meta[name="description"]')).toBe(
      'سلوتي (Sloty) منصة مصرية لحجز وإدارة ملاعب كرة القدم، تساعد اللاعبين على معرفة المواعيد المتاحة وأصحاب الملاعب وفريق العمل على إدارة الحجوزات والمواعيد بسهولة.',
    )
    expect(content(doc, 'meta[property="og:title"]')).toBe(doc.title)
    expect(content(doc, 'meta[property="og:type"]')).toBe('website')
    expect(doc.querySelector('h1')?.textContent).toBe('سلوتي لحجز ملاعب كرة القدم')
    expect(doc.querySelector('h2')?.textContent).toBe('ملاعب كرة القدم')
    for (const term of ['Sloty', 'سلوتي', 'ملاعب كرة القدم']) {
      expect(text).toContain(term)
    }
    expect(doc.querySelector('#root > [data-sloty-prerender="/"]')).not.toBeNull()
    expect(doc.querySelector('a[href="/about/"]')).not.toBeNull()
  })

  it('prerenders the Court list loading state, never build-time or invented Courts', () => {
    const doc = parse(renderFiles().get('index.html') ?? '')

    expect(doc.querySelector('[role="status"]')?.textContent).toBe('جاري تحميل الملاعب...')
    expect(doc.querySelector('[data-testid="discovery-court-card"]')).toBeNull()
    expect(doc.querySelector('a[href^="/public/"]')).toBeNull()
  })

  it('prerenders complete URL-identity tags into index.html as the dedicated homepage file', () => {
    const doc = parse(renderFiles().get('index.html') ?? '')

    expect(content(doc, 'meta[name="robots"]')).toBe('index, follow')
    expect(doc.querySelectorAll('link[rel="canonical"]')).toHaveLength(1)
    expect(doc.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      'https://sloty.baronlearning.com/',
    )
    expect(content(doc, 'meta[property="og:url"]')).toBe('https://sloty.baronlearning.com/')
  })

  it('emits app.html as a clean, noindex SPA fallback with empty #root and no homepage metadata', () => {
    const doc = parse(renderFiles().get('app.html') ?? '')

    expect(doc.title).toBe('Sloty | سلوتي')
    expect(content(doc, 'meta[name="robots"]')).toBe('noindex, nofollow')
    expect(doc.querySelector('meta[name="description"]')).toBeNull()
    expect(doc.querySelector('meta[property^="og:"]')).toBeNull()
    expect(doc.querySelector('meta[name^="twitter:"]')).toBeNull()
    expect(doc.querySelector('link[rel="canonical"]')).toBeNull()
    expect(doc.querySelector('script[type="application/ld+json"]')).toBeNull()
    expect(doc.querySelector('#root')?.innerHTML).toBe('')
    expect(doc.querySelector('[data-sloty-prerender]')).toBeNull()
    expect(doc.querySelector('script[type="module"][src="/src/main.tsx"]')).not.toBeNull()
  })

  it('writes a complete, indexable head for the dedicated About file', () => {
    const doc = parse(renderFiles().get('about/index.html') ?? '')

    expect(doc.title).toBe('عن سلوتي | Sloty')
    expect(content(doc, 'meta[name="robots"]')).toBe('index, follow')
    expect(doc.querySelectorAll('link[rel="canonical"]')).toHaveLength(1)
    expect(doc.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      'https://sloty.baronlearning.com/about/',
    )
    expect(content(doc, 'meta[property="og:url"]')).toBe('https://sloty.baronlearning.com/about/')
    expect(doc.querySelector('h1')?.textContent).toBe('عن سلوتي')
    expect(doc.querySelector('#root > [data-sloty-prerender="/about/"]')).not.toBeNull()
    expect(doc.querySelector('a[href="/"]')).not.toBeNull()
    expect(doc.querySelector('[role="status"]')).toBeNull()
  })

  it('keeps unique titles and descriptions per public page', () => {
    const files = renderFiles()
    const home = parse(files.get('index.html') ?? '')
    const about = parse(files.get('about/index.html') ?? '')

    expect(home.title).not.toBe(about.title)
    expect(content(home, 'meta[name="description"]')).not.toBe(
      content(about, 'meta[name="description"]'),
    )
  })

  it('embeds valid JSON-LD with Sloty identity in each page', () => {
    const files = renderFiles()
    for (const fileName of ['index.html', 'about/index.html']) {
      const scripts = parse(files.get(fileName) ?? '').querySelectorAll(
        'script[type="application/ld+json"]',
      )
      expect(scripts).toHaveLength(1)
      const data = JSON.parse(scripts[0].textContent ?? '')
      expect(data['@context']).toBe('https://schema.org')
      expect(JSON.stringify(data)).toContain('https://sloty.baronlearning.com/#website')
      expect(JSON.stringify(data)).not.toContain('LocalBusiness')
    }
  })

  it('keeps the app shell scripts, PWA manifest link, and inline deep-link guard', () => {
    const html = renderFiles().get('index.html') ?? ''

    expect(html).toContain('<script type="module" src="/src/main.tsx"></script>')
    expect(html).toContain('data-sloty-prerender-hidden')
    expect(html).toContain('<meta name="theme-color" content="#0B6B3A" />')
    expect(html).not.toContain('name="keywords"')
  })

  it('generates robots.txt and a sitemap with only indexable public pages', () => {
    const files = renderFiles()
    const sitemap = files.get('sitemap.xml') ?? ''

    expect(files.get('robots.txt')).toContain(
      'Sitemap: https://sloty.baronlearning.com/sitemap.xml',
    )
    expect(sitemap.match(/<loc>[^<]+<\/loc>/g)).toEqual([
      '<loc>https://sloty.baronlearning.com/</loc>',
      '<loc>https://sloty.baronlearning.com/about/</loc>',
    ])
    for (const privatePath of ['/login', '/dashboard', '/admin', '/transactions', '/settlements', '/schedule', '/public/', '/courts', '/clubs']) {
      expect(sitemap).not.toContain(`baronlearning.com${privatePath}`)
    }
  })

  it('fails the build when the public site URL is missing or invalid', () => {
    expect(() => renderStaticSeoFiles({ template: TEMPLATE, siteUrl: undefined })).toThrow(
      /VITE_PUBLIC_SITE_URL/,
    )
    expect(() => renderStaticSeoFiles({ template: TEMPLATE, siteUrl: 'not a url' })).toThrow(
      /VITE_PUBLIC_SITE_URL/,
    )
  })
})
