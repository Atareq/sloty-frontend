import { buildPublicSiteUrl } from './publicSiteOrigin'
import {
  SEO_MANAGED_ATTRIBUTE,
  SEO_OPEN_GRAPH_LOCALE,
  SEO_SITE_NAME,
  SEO_SOCIAL_IMAGE_ALT,
  SEO_SOCIAL_IMAGE_PATH,
} from './seoConfig'
import type { JsonLdNode, PageSeo, SeoHeadTag } from './seo.types'

export const ROBOTS_INDEX = 'index, follow'
export const ROBOTS_NOINDEX = 'noindex, nofollow'

export interface BuildSeoHeadTagsOptions {
  /** Canonical public origin, or `null` when it is not configured. */
  origin: string | null
  /**
   * Whether to emit tags that identify one specific URL: `robots`,
   * `<link rel="canonical">`, and `og:url`.
   */
  includeUrlIdentity: boolean
}

function meta(
  attribute: 'name' | 'property',
  key: string,
  content: string,
): SeoHeadTag {
  return { type: 'meta', attribute, key, content }
}

/**
 * Serializes a JSON-LD graph for a `<script type="application/ld+json">`.
 *
 * `<` is escaped so the payload can never close its script element.
 */
export function serializeJsonLd(nodes: readonly JsonLdNode[]): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': nodes,
  }).replace(/</g, '\\u003c')
}

/**
 * Builds every SEO head tag for one page from its route SEO definition.
 *
 * This is the only place that decides which metadata a page emits. Noindex
 * pages get only a robots directive; indexable pages add description,
 * canonical, Open Graph, and optional JSON-LD. `<meta name="keywords">` is
 * intentionally never produced.
 */
export function buildSeoHeadTags(
  seo: PageSeo,
  { origin, includeUrlIdentity }: BuildSeoHeadTagsOptions,
): SeoHeadTag[] {
  const tags: SeoHeadTag[] = []

  if (seo.robots === 'noindex') {
    if (includeUrlIdentity) {
      tags.push(meta('name', 'robots', ROBOTS_NOINDEX))
    }
    return tags
  }

  tags.push(meta('name', 'description', seo.description))

  if (includeUrlIdentity) {
    tags.push(meta('name', 'robots', ROBOTS_INDEX))
    if (origin) {
      tags.push({
        type: 'link',
        rel: 'canonical',
        href: buildPublicSiteUrl(origin, seo.canonicalPath),
      })
    }
  }

  tags.push(
    meta('property', 'og:type', 'website'),
    meta('property', 'og:site_name', SEO_SITE_NAME),
    meta('property', 'og:locale', SEO_OPEN_GRAPH_LOCALE),
    meta('property', 'og:title', seo.title),
    meta('property', 'og:description', seo.description),
  )

  if (origin) {
    if (includeUrlIdentity) {
      tags.push(
        meta('property', 'og:url', buildPublicSiteUrl(origin, seo.canonicalPath)),
      )
    }
    tags.push(
      meta(
        'property',
        'og:image',
        buildPublicSiteUrl(origin, SEO_SOCIAL_IMAGE_PATH),
      ),
      meta('property', 'og:image:alt', SEO_SOCIAL_IMAGE_ALT),
    )
  }

  tags.push(meta('name', 'twitter:card', 'summary'))

  if (origin && seo.structuredData) {
    tags.push({ type: 'json-ld', json: serializeJsonLd(seo.structuredData(origin)) })
  }

  return tags
}

/** Escapes text for use inside HTML text nodes and quoted attributes. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderTag(tag: SeoHeadTag): string {
  switch (tag.type) {
    case 'meta':
      return `<meta ${tag.attribute}="${escapeHtml(tag.key)}" content="${escapeHtml(tag.content)}" ${SEO_MANAGED_ATTRIBUTE} />`
    case 'link':
      return `<link rel="${tag.rel}" href="${escapeHtml(tag.href)}" ${SEO_MANAGED_ATTRIBUTE} />`
    case 'json-ld':
      return `<script type="application/ld+json" ${SEO_MANAGED_ATTRIBUTE}>${tag.json}</script>`
  }
}

/**
 * Serializes a page title plus SEO head tags to static HTML for prerendering.
 *
 * Tags keep the managed marker so the runtime layer can replace them after
 * client-side navigation.
 */
export function renderSeoHeadHtml(title: string, tags: readonly SeoHeadTag[]): string {
  return [`<title>${escapeHtml(title)}</title>`, ...tags.map(renderTag)].join(
    '\n    ',
  )
}
