import { buildPublicSiteUrl } from '../../core/seo/publicSiteOrigin'
import {
  SEO_SITE_ARABIC_NAME,
  SEO_SITE_NAME,
  SEO_SOCIAL_IMAGE_PATH,
} from '../../core/seo/seoConfig'
import type { IndexablePageSeo, JsonLdNode } from '../../core/seo/seo.types'
import {
  aboutPageCopy,
  homePageCopy,
  publicSiteIdentityCopy,
} from './publicSite.copy'

/**
 * Canonical public paths. Links and canonicals always use these forms.
 *
 * `/` is the public player discovery page (the primary SEO surface); `/about/`
 * is the brand and trust page.
 */
export const PUBLIC_HOME_PATH = '/'
export const ABOUT_PATH = '/about/'

export type IndexablePublicPath = typeof PUBLIC_HOME_PATH | typeof ABOUT_PATH

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

/** About JSON-LD: the AboutPage for the Sloty Organization plus its breadcrumb. */
function buildAboutStructuredData(origin: string): JsonLdNode[] {
  const homeUrl = buildPublicSiteUrl(origin, PUBLIC_HOME_PATH)
  const aboutUrl = buildPublicSiteUrl(origin, ABOUT_PATH)

  return [
    {
      '@type': 'AboutPage',
      '@id': `${aboutUrl}#webpage`,
      url: aboutUrl,
      name: aboutPageCopy.metaTitle,
      description: aboutPageCopy.metaDescription,
      inLanguage: 'ar',
      isPartOf: { '@id': websiteId(origin) },
      about: { '@id': organizationId(origin) },
      breadcrumb: { '@id': `${aboutUrl}#breadcrumb` },
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${aboutUrl}#breadcrumb`,
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
          name: aboutPageCopy.breadcrumbCurrent,
          item: aboutUrl,
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

export const aboutPageSeo: IndexablePageSeo = {
  robots: 'index',
  title: aboutPageCopy.metaTitle,
  description: aboutPageCopy.metaDescription,
  canonicalPath: ABOUT_PATH,
  structuredData: buildAboutStructuredData,
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
 * Individual Courts are reached through discovery and are not listed here.
 */
export const indexablePublicPages: readonly IndexablePublicPage[] = [
  { path: PUBLIC_HOME_PATH, seo: homePageSeo },
  { path: ABOUT_PATH, seo: aboutPageSeo },
]
