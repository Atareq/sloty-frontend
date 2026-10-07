/**
 * JSON value accepted inside a JSON-LD node.
 *
 * Structured data is serialized with `JSON.stringify`, so only plain JSON
 * values are allowed (no functions, dates, or class instances).
 */
export type JsonLdValue =
  | string
  | number
  | boolean
  | null
  | readonly JsonLdValue[]
  | { readonly [key: string]: JsonLdValue }

/** One schema.org node placed inside the page's JSON-LD `@graph`. */
export type JsonLdNode = { readonly [key: string]: JsonLdValue }

/**
 * Builds a page's JSON-LD graph from the canonical public site origin.
 *
 * Structured data needs absolute URLs, so it is only emitted when the origin
 * is configured (see `publicSiteOrigin.ts`).
 */
export type StructuredDataBuilder = (origin: string) => readonly JsonLdNode[]

/**
 * SEO contract for a page that search engines should index.
 *
 * Indexable pages must always carry a description and one canonical path, so
 * the type makes both required.
 */
export interface IndexablePageSeo {
  robots: 'index'
  /** Full document title. */
  title: string
  /** Meta and Open Graph description. */
  description: string
  /** Canonical path on the public site origin, e.g. `/` or `/about/`. */
  canonicalPath: `/${string}`
  structuredData?: StructuredDataBuilder
}

/**
 * SEO contract for application or utility pages that must not be indexed.
 *
 * These pages never emit canonical, Open Graph, or JSON-LD tags.
 */
export interface NoindexPageSeo {
  robots: 'noindex'
  /** Full document title. */
  title: string
}

/** Route-level SEO definition consumed by the central SEO layer. */
export type PageSeo = IndexablePageSeo | NoindexPageSeo

/**
 * Head tag produced by `buildSeoHeadTags()`.
 *
 * The same descriptors are applied to the live DOM at runtime and serialized
 * to HTML at build time, so runtime and prerendered heads cannot drift.
 */
export type SeoHeadTag =
  | {
      type: 'meta'
      attribute: 'name' | 'property'
      key: string
      content: string
    }
  | { type: 'link'; rel: 'canonical'; href: string }
  | { type: 'json-ld'; json: string }
