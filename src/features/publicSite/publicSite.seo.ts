import { buildPublicSiteUrl } from '../../core/seo/publicSiteOrigin'
import {
  SEO_SITE_ARABIC_NAME,
  SEO_SITE_NAME,
  SEO_SOCIAL_IMAGE_PATH,
} from '../../core/seo/seoConfig'
import type { IndexablePageSeo, JsonLdNode } from '../../core/seo/seo.types'
import {
  assiutPageCopy,
  homePageCopy,
  publicSiteIdentityCopy,
} from './publicSite.copy'

/** Canonical public paths. Links and canonicals always use these forms. */
export const PUBLIC_HOME_PATH = '/'
export const ASSIUT_PATH = '/assiut/'

export type IndexablePublicPath = typeof PUBLIC_HOME_PATH | typeof ASSIUT_PATH

const assiutPlace: JsonLdNode = {
  '@type': 'City',
  name: 'أسيوط',
  alternateName: ['Assiut', 'Asyut'],
  containedInPlace: {
    '@type': 'Country',
    name: 'مصر',
    alternateName: 'Egypt',
  },
}

function organizationId(origin: string): string {
  return `${buildPublicSiteUrl(origin, PUBLIC_HOME_PATH)}#organization`
}

function websiteId(origin: string): string {
  return `${buildPublicSiteUrl(origin, PUBLIC_HOME_PATH)}#website`
}

/**
 * Homepage JSON-LD: Sloty as Organization, WebSite, SoftwareApplication, and
 * the homepage WebPage.
 *
 * Only verifiable facts are included. There is deliberately no address,
 * phone, rating, review, price/offer, or customer count, and no LocalBusiness:
 * Sloty is a software platform, not a physical venue.
 */
function buildHomeStructuredData(origin: string): JsonLdNode[] {
  const homeUrl = buildPublicSiteUrl(origin, PUBLIC_HOME_PATH)

  return [
    {
      '@type': 'Organization',
      '@id': organizationId(origin),
      name: SEO_SITE_NAME,
      alternateName: SEO_SITE_ARABIC_NAME,
      url: homeUrl,
      logo: buildPublicSiteUrl(origin, SEO_SOCIAL_IMAGE_PATH),
      description: publicSiteIdentityCopy.statement,
      areaServed: assiutPlace,
    },
    {
      '@type': 'WebSite',
      '@id': websiteId(origin),
      url: homeUrl,
      name: SEO_SITE_NAME,
      alternateName: SEO_SITE_ARABIC_NAME,
      inLanguage: 'ar',
      publisher: { '@id': organizationId(origin) },
    },
    {
      '@type': 'SoftwareApplication',
      '@id': `${homeUrl}#software`,
      name: SEO_SITE_NAME,
      alternateName: SEO_SITE_ARABIC_NAME,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      url: homeUrl,
      inLanguage: 'ar',
      description: publicSiteIdentityCopy.statement,
      disambiguatingDescription: publicSiteIdentityCopy.english,
      publisher: { '@id': organizationId(origin) },
    },
    {
      '@type': 'WebPage',
      '@id': `${homeUrl}#webpage`,
      url: homeUrl,
      name: homePageCopy.metaTitle,
      description: homePageCopy.metaDescription,
      inLanguage: 'ar',
      isPartOf: { '@id': websiteId(origin) },
      about: { '@id': organizationId(origin) },
    },
  ]
}

/** Assiut JSON-LD: the landing WebPage about the city plus its breadcrumb. */
function buildAssiutStructuredData(origin: string): JsonLdNode[] {
  const homeUrl = buildPublicSiteUrl(origin, PUBLIC_HOME_PATH)
  const assiutUrl = buildPublicSiteUrl(origin, ASSIUT_PATH)

  return [
    {
      '@type': 'WebPage',
      '@id': `${assiutUrl}#webpage`,
      url: assiutUrl,
      name: assiutPageCopy.metaTitle,
      description: assiutPageCopy.metaDescription,
      inLanguage: 'ar',
      isPartOf: { '@id': websiteId(origin) },
      publisher: { '@id': organizationId(origin) },
      about: assiutPlace,
      breadcrumb: { '@id': `${assiutUrl}#breadcrumb` },
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${assiutUrl}#breadcrumb`,
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: SEO_SITE_NAME,
          item: homeUrl,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: assiutPageCopy.breadcrumbCurrent,
          item: assiutUrl,
        },
      ],
    },
  ]
}

export const homePageSeo: IndexablePageSeo = {
  robots: 'index',
  title: homePageCopy.metaTitle,
  description: homePageCopy.metaDescription,
  canonicalPath: PUBLIC_HOME_PATH,
  structuredData: buildHomeStructuredData,
}

export const assiutPageSeo: IndexablePageSeo = {
  robots: 'index',
  title: assiutPageCopy.metaTitle,
  description: assiutPageCopy.metaDescription,
  canonicalPath: ASSIUT_PATH,
  structuredData: buildAssiutStructuredData,
}

export interface IndexablePublicPage {
  path: IndexablePublicPath
  seo: IndexablePageSeo
}

/**
 * Registry of every indexable public page.
 *
 * It drives `sitemap.xml` and the build-time prerender. Add a page here only
 * when it is a real public page backed by real content or Backend data.
 */
export const indexablePublicPages: readonly IndexablePublicPage[] = [
  { path: PUBLIC_HOME_PATH, seo: homePageSeo },
  { path: ASSIUT_PATH, seo: assiutPageSeo },
]
