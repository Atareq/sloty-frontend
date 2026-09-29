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
      'app.html',
      'assiut/index.html',
      'index.html',
      'robots.txt',
      'sitemap.xml',
    ])
  })

  it('prerenders the homepage identity into index.html', () => {
    const doc = parse(renderFiles().get('index.html') ?? '')
    const text = doc.body.textContent ?? ''

    expect(doc.title).toBe('Sloty | سلوتي لحجز وإدارة ملاعب كرة القدم في أسيوط ومصر')
    expect(content(doc, 'meta[name="description"]')).toContain('سلوتي Sloty منصة لحجز وإدارة ملاعب كرة القدم')
    expect(content(doc, 'meta[property="og:title"]')).toBe(doc.title)
    expect(content(doc, 'meta[property="og:type"]')).toBe('website')
    expect(doc.querySelector('h1')?.textContent).toBe('إدارة وحجز الملاعب بسهولة مع Sloty')
    for (const term of ['Sloty', 'سلوتي', 'أسيوط', 'مصر', 'حجز وإدارة ملاعب كرة القدم', 'football pitches']) {
      expect(text).toContain(term)
    }
    expect(doc.querySelector('#root > [data-sloty-prerender="/"]')).not.toBeNull()
    expect(doc.querySelector('a[href="/assiut/"]')).not.toBeNull()
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

  it('writes a complete, indexable head for the dedicated Assiut file', () => {
    const doc = parse(renderFiles().get('assiut/index.html') ?? '')

    expect(doc.title).toBe('حجز ملاعب كرة القدم في أسيوط | Sloty')
    expect(content(doc, 'meta[name="robots"]')).toBe('index, follow')
    expect(doc.querySelectorAll('link[rel="canonical"]')).toHaveLength(1)
    expect(doc.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      'https://sloty.baronlearning.com/assiut/',
    )
    expect(content(doc, 'meta[property="og:url"]')).toBe('https://sloty.baronlearning.com/assiut/')
    expect(doc.querySelector('h1')?.textContent).toBe('ملاعب كرة القدم والحجز في أسيوط')
    expect(doc.querySelector('a[href="/"]')).not.toBeNull()
  })

  it('keeps unique titles and descriptions per public page', () => {
    const files = renderFiles()
    const home = parse(files.get('index.html') ?? '')
    const assiut = parse(files.get('assiut/index.html') ?? '')

    expect(home.title).not.toBe(assiut.title)
    expect(content(home, 'meta[name="description"]')).not.toBe(
      content(assiut, 'meta[name="description"]'),
    )
  })

  it('embeds valid JSON-LD with Sloty identity in each page', () => {
    const files = renderFiles()
    for (const fileName of ['index.html', 'assiut/index.html']) {
      const scripts = parse(files.get(fileName) ?? '').querySelectorAll(
        'script[type="application/ld+json"]',
      )
      expect(scripts).toHaveLength(1)
      const data = JSON.parse(scripts[0].textContent ?? '')
      expect(data['@context']).toBe('https://schema.org')
      expect(JSON.stringify(data)).toContain('https://sloty.baronlearning.com/#website')
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
      '<loc>https://sloty.baronlearning.com/assiut/</loc>',
    ])
    for (const privatePath of ['/login', '/dashboard', '/admin', '/transactions', '/settlements', '/schedule', '/public/']) {
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
