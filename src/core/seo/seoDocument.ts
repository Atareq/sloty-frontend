import { SEO_MANAGED_ATTRIBUTE } from './seoConfig'
import { buildSeoHeadTags } from './seoHead'
import type { PageSeo, SeoHeadTag } from './seo.types'

function createHeadElement(doc: Document, tag: SeoHeadTag): HTMLElement {
  switch (tag.type) {
    case 'meta': {
      const element = doc.createElement('meta')
      element.setAttribute(tag.attribute, tag.key)
      element.setAttribute('content', tag.content)
      element.setAttribute(SEO_MANAGED_ATTRIBUTE, '')
      return element
    }
    case 'link': {
      const element = doc.createElement('link')
      element.setAttribute('rel', tag.rel)
      element.setAttribute('href', tag.href)
      element.setAttribute(SEO_MANAGED_ATTRIBUTE, '')
      return element
    }
    case 'json-ld': {
      const element = doc.createElement('script')
      element.setAttribute('type', 'application/ld+json')
      element.setAttribute(SEO_MANAGED_ATTRIBUTE, '')
      element.textContent = tag.json
      return element
    }
  }
}

/**
 * Applies one page's SEO definition to the live document head.
 *
 * Every tag previously written by the SEO layer (marked with
 * `data-sloty-seo`, including prerendered ones) is replaced, so navigating
 * from a public page to a private one never leaves a stale canonical or
 * JSON-LD behind. Unmanaged tags such as viewport or theme-color are untouched.
 */
export function applyDocumentSeo(
  doc: Document,
  seo: PageSeo,
  origin: string | null,
): void {
  doc.title = seo.title

  doc.head
    .querySelectorAll(`[${SEO_MANAGED_ATTRIBUTE}]`)
    .forEach((element) => element.remove())

  for (const tag of buildSeoHeadTags(seo, { origin, includeUrlIdentity: true })) {
    doc.head.appendChild(createHeadElement(doc, tag))
  }
}
