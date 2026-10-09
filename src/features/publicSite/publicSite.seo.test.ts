import { describe, expect, it } from 'vitest'
import { serializeJsonLd } from '../../core/seo/seoHead'
import type { JsonLdNode } from '../../core/seo/seo.types'
import {
  ABOUT_PATH,
  PUBLIC_HOME_PATH,
  aboutPageSeo,
  homePageSeo,
  indexablePublicPages,
} from './publicSite.seo'

const ORIGIN = 'https://sloty.baronlearning.com'

function graph(nodes: readonly JsonLdNode[]): JsonLdNode[] {
  return JSON.parse(serializeJsonLd(nodes))['@graph']
}

function nodeOfType(nodes: JsonLdNode[], type: string): JsonLdNode | undefined {
  return nodes.find((node) => node['@type'] === type)
}

describe('public site SEO definitions', () => {
  it('registers exactly public discovery and About as indexable', () => {
    expect(indexablePublicPages.map((page) => page.path)).toEqual([
      PUBLIC_HOME_PATH,
      ABOUT_PATH,
    ])
    expect(indexablePublicPages.every((page) => page.seo.robots === 'index')).toBe(true)
    expect(indexablePublicPages.every((page) => page.seo.canonicalPath === page.path)).toBe(
      true,
    )
  })

  it('uses canonical trailing-slash paths and registers no city or Court URLs', () => {
    expect(homePageSeo.canonicalPath).toBe('/')
    expect(aboutPageSeo.canonicalPath).toBe('/about/')
    for (const page of indexablePublicPages) {
      expect(page.path).not.toMatch(/assiut|public|courts|clubs/)
    }
  })

  it('gives each page a unique title and description', () => {
    expect(homePageSeo.title).not.toBe(aboutPageSeo.title)
    expect(homePageSeo.description).not.toBe(aboutPageSeo.description)
  })

  it('frames discovery around Sloty and football Court booking and management', () => {
    expect(homePageSeo.title).toBe('Sloty | سلوتي لحجز وإدارة ملاعب كرة القدم')
    expect(homePageSeo.description).toBe(
      'سلوتي (Sloty) منصة مصرية لحجز وإدارة ملاعب كرة القدم، تساعد اللاعبين على معرفة المواعيد المتاحة وأصحاب الملاعب وفريق العمل على إدارة الحجوزات والمواعيد بسهولة.',
    )
    expect(aboutPageSeo.title).toBe('عن سلوتي | Sloty')
    for (const term of ['سلوتي', 'Sloty', 'ملاعب كرة القدم']) {
      expect(aboutPageSeo.description).toContain(term)
    }
  })

  it('describes Sloty as Organization, WebSite, and a business SoftwareApplication', () => {
    const nodes = graph(homePageSeo.structuredData?.(ORIGIN) ?? [])
    const organization = nodeOfType(nodes, 'Organization')
    const software = nodeOfType(nodes, 'SoftwareApplication')

    expect(nodes.map((node) => node['@type'])).toEqual([
      'Organization',
      'WebSite',
      'SoftwareApplication',
      'WebPage',
    ])
    expect(organization).toMatchObject({
      name: 'Sloty',
      alternateName: 'سلوتي',
      url: 'https://sloty.baronlearning.com/',
      logo: 'https://sloty.baronlearning.com/icons/sloty-512x512.png',
    })
    expect(organization?.areaServed).toBeUndefined()
    expect(String(organization?.description)).toContain(
      'سلوتي (Sloty) منصة لحجز وإدارة ملاعب كرة القدم',
    )
    expect(nodeOfType(nodes, 'WebSite')).toMatchObject({
      url: 'https://sloty.baronlearning.com/',
      inLanguage: 'ar',
    })
    expect(software).toMatchObject({
      name: 'Sloty',
      alternateName: 'سلوتي',
      applicationCategory: 'BusinessApplication',
    })
    expect(String(software?.disambiguatingDescription)).toContain(
      'booking and managing football pitches',
    )
  })

  it('describes the About page as an AboutPage of the Sloty Organization with a breadcrumb', () => {
    const nodes = graph(aboutPageSeo.structuredData?.(ORIGIN) ?? [])

    expect(nodeOfType(nodes, 'AboutPage')).toMatchObject({
      url: 'https://sloty.baronlearning.com/about/',
      about: { '@id': 'https://sloty.baronlearning.com/#organization' },
      isPartOf: { '@id': 'https://sloty.baronlearning.com/#website' },
    })
    expect(nodeOfType(nodes, 'BreadcrumbList')?.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Sloty', item: 'https://sloty.baronlearning.com/' },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'عن سلوتي',
        item: 'https://sloty.baronlearning.com/about/',
      },
    ])
  })

  it('contains no invented facts, LocalBusiness claims, or Court entities', () => {
    const serialized = serializeJsonLd([
      ...(homePageSeo.structuredData?.(ORIGIN) ?? []),
      ...(aboutPageSeo.structuredData?.(ORIGIN) ?? []),
    ])

    for (const forbidden of [
      'LocalBusiness',
      'SportsActivityLocation',
      'SportsClub',
      'ItemList',
      'areaServed',
      'aggregateRating',
      'review',
      'offers',
      'price',
      'telephone',
      'address',
      'geo',
      'openingHours',
      'userInteractionCount',
    ]) {
      expect(serialized).not.toContain(`"${forbidden}"`)
    }
    expect(serialized).not.toContain('/public/')
  })
})
