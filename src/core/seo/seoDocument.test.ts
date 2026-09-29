import { beforeEach, describe, expect, it } from 'vitest'
import { applyDocumentSeo } from './seoDocument'
import type { IndexablePageSeo } from './seo.types'
import { privateAppSeo } from './seoConfig'

const ORIGIN = 'https://sloty.example'

const publicSeo: IndexablePageSeo = {
  robots: 'index',
  title: 'صفحة عامة | Sloty',
  description: 'وصف عام',
  canonicalPath: '/',
  structuredData: () => [{ '@type': 'WebSite', name: 'Sloty' }],
}

describe('applyDocumentSeo', () => {
  beforeEach(() => {
    document.head.innerHTML =
      '<meta name="viewport" content="width=device-width" /><meta name="theme-color" content="#0B6B3A" />' +
      '<meta name="description" content="prerendered" data-sloty-seo />'
    document.title = 'initial'
  })

  it('writes title, robots, canonical, Open Graph, and JSON-LD', () => {
    applyDocumentSeo(document, publicSeo, ORIGIN)

    expect(document.title).toBe('صفحة عامة | Sloty')
    expect(
      document.head.querySelector('meta[name="robots"]')?.getAttribute('content'),
    ).toBe('index, follow')
    expect(
      document.head.querySelector('link[rel="canonical"]')?.getAttribute('href'),
    ).toBe('https://sloty.example/')
    expect(
      document.head.querySelector('meta[property="og:title"]')?.getAttribute('content'),
    ).toBe('صفحة عامة | Sloty')
    const jsonLd = document.head.querySelector('script[type="application/ld+json"]')
    expect(JSON.parse(jsonLd?.textContent ?? '{}')['@graph']).toEqual([
      { '@type': 'WebSite', name: 'Sloty' },
    ])
  })

  it('replaces prerendered managed tags instead of duplicating them', () => {
    applyDocumentSeo(document, publicSeo, ORIGIN)
    applyDocumentSeo(document, publicSeo, ORIGIN)

    const descriptions = document.head.querySelectorAll('meta[name="description"]')
    expect(descriptions).toHaveLength(1)
    expect(descriptions[0].getAttribute('content')).toBe('وصف عام')
    expect(document.head.querySelectorAll('link[rel="canonical"]')).toHaveLength(1)
  })

  it('removes public tags when navigating to a private page', () => {
    applyDocumentSeo(document, publicSeo, ORIGIN)
    applyDocumentSeo(document, privateAppSeo, ORIGIN)

    expect(document.title).toBe('Sloty | سلوتي')
    expect(
      document.head.querySelector('meta[name="robots"]')?.getAttribute('content'),
    ).toBe('noindex, nofollow')
    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull()
    expect(document.head.querySelector('meta[name="description"]')).toBeNull()
    expect(document.head.querySelector('meta[property^="og:"]')).toBeNull()
    expect(document.head.querySelector('script[type="application/ld+json"]')).toBeNull()
  })

  it('leaves unmanaged head tags untouched', () => {
    applyDocumentSeo(document, privateAppSeo, ORIGIN)

    expect(document.head.querySelector('meta[name="viewport"]')).not.toBeNull()
    expect(document.head.querySelector('meta[name="theme-color"]')).not.toBeNull()
  })
})
