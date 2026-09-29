import { describe, expect, it } from 'vitest'
import {
  buildSeoHeadTags,
  escapeHtml,
  renderSeoHeadHtml,
  serializeJsonLd,
} from './seoHead'
import type { IndexablePageSeo, NoindexPageSeo, SeoHeadTag } from './seo.types'

const ORIGIN = 'https://sloty.example'

const indexableSeo: IndexablePageSeo = {
  robots: 'index',
  title: 'عنوان الصفحة | Sloty',
  description: 'وصف الصفحة',
  canonicalPath: '/assiut/',
  structuredData: (origin) => [{ '@type': 'WebPage', url: `${origin}/assiut/` }],
}

const noindexSeo: NoindexPageSeo = { robots: 'noindex', title: 'Sloty | سلوتي' }

function metaContent(tags: SeoHeadTag[], key: string): string | undefined {
  const tag = tags.find((item) => item.type === 'meta' && item.key === key)
  return tag?.type === 'meta' ? tag.content : undefined
}

describe('buildSeoHeadTags', () => {
  it('emits robots, canonical, Open Graph, and JSON-LD for indexable pages', () => {
    const tags = buildSeoHeadTags(indexableSeo, {
      origin: ORIGIN,
      includeUrlIdentity: true,
    })

    expect(metaContent(tags, 'description')).toBe('وصف الصفحة')
    expect(metaContent(tags, 'robots')).toBe('index, follow')
    expect(tags).toContainEqual({
      type: 'link',
      rel: 'canonical',
      href: 'https://sloty.example/assiut/',
    })
    expect(metaContent(tags, 'og:title')).toBe('عنوان الصفحة | Sloty')
    expect(metaContent(tags, 'og:description')).toBe('وصف الصفحة')
    expect(metaContent(tags, 'og:type')).toBe('website')
    expect(metaContent(tags, 'og:url')).toBe('https://sloty.example/assiut/')
    expect(metaContent(tags, 'og:image')).toBe(
      'https://sloty.example/icons/sloty-512x512.png',
    )
    expect(tags.filter((tag) => tag.type === 'json-ld')).toHaveLength(1)
  })

  it('emits exactly one canonical', () => {
    const tags = buildSeoHeadTags(indexableSeo, {
      origin: ORIGIN,
      includeUrlIdentity: true,
    })

    expect(tags.filter((tag) => tag.type === 'link')).toHaveLength(1)
  })

  it('emits only a noindex robots directive for private pages', () => {
    const tags = buildSeoHeadTags(noindexSeo, {
      origin: ORIGIN,
      includeUrlIdentity: true,
    })

    expect(tags).toEqual([
      { type: 'meta', attribute: 'name', key: 'robots', content: 'noindex, nofollow' },
    ])
  })

  it('omits URL-identity tags for the shared SPA fallback document', () => {
    const tags = buildSeoHeadTags(indexableSeo, {
      origin: ORIGIN,
      includeUrlIdentity: false,
    })

    expect(metaContent(tags, 'robots')).toBeUndefined()
    expect(metaContent(tags, 'og:url')).toBeUndefined()
    expect(tags.some((tag) => tag.type === 'link')).toBe(false)
    expect(metaContent(tags, 'description')).toBe('وصف الصفحة')
    expect(tags.some((tag) => tag.type === 'json-ld')).toBe(true)
  })

  it('never emits absolute URLs without a configured origin', () => {
    const tags = buildSeoHeadTags(indexableSeo, {
      origin: null,
      includeUrlIdentity: true,
    })

    expect(tags.some((tag) => tag.type === 'link')).toBe(false)
    expect(metaContent(tags, 'og:url')).toBeUndefined()
    expect(metaContent(tags, 'og:image')).toBeUndefined()
    expect(tags.some((tag) => tag.type === 'json-ld')).toBe(false)
    expect(metaContent(tags, 'robots')).toBe('index, follow')
  })

  it('never emits meta keywords', () => {
    for (const seo of [indexableSeo, noindexSeo]) {
      const tags = buildSeoHeadTags(seo, { origin: ORIGIN, includeUrlIdentity: true })
      expect(metaContent(tags, 'keywords')).toBeUndefined()
    }
  })
})

describe('serializeJsonLd', () => {
  it('wraps nodes in a schema.org graph and cannot close its script element', () => {
    const json = serializeJsonLd([{ '@type': 'Thing', name: '</script><b>' }])

    expect(json).not.toContain('</script>')
    expect(JSON.parse(json)).toEqual({
      '@context': 'https://schema.org',
      '@graph': [{ '@type': 'Thing', name: '</script><b>' }],
    })
  })
})

describe('renderSeoHeadHtml', () => {
  it('escapes titles and attribute values and marks managed tags', () => {
    const html = renderSeoHeadHtml('A & "B" <C>', [
      { type: 'meta', attribute: 'name', key: 'description', content: '"x" <y>' },
    ])

    expect(html).toContain('<title>A &amp; &quot;B&quot; &lt;C&gt;</title>')
    expect(html).toContain(
      '<meta name="description" content="&quot;x&quot; &lt;y&gt;" data-sloty-seo />',
    )
  })

  it('escapes single quotes too', () => {
    expect(escapeHtml("it's")).toBe('it&#39;s')
  })
})
