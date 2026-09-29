import { describe, expect, it } from 'vitest'
import { serializeJsonLd } from '../../core/seo/seoHead'
import type { JsonLdNode } from '../../core/seo/seo.types'
import {
  ASSIUT_PATH,
  PUBLIC_HOME_PATH,
  assiutPageSeo,
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
  it('registers exactly the homepage and the Assiut page as indexable', () => {
    expect(indexablePublicPages.map((page) => page.path)).toEqual([
      PUBLIC_HOME_PATH,
      ASSIUT_PATH,
    ])
    expect(indexablePublicPages.every((page) => page.seo.robots === 'index')).toBe(true)
    expect(indexablePublicPages.every((page) => page.seo.canonicalPath === page.path)).toBe(
      true,
    )
  })

  it('uses canonical trailing-slash paths', () => {
    expect(homePageSeo.canonicalPath).toBe('/')
    expect(assiutPageSeo.canonicalPath).toBe('/assiut/')
  })

  it('gives each page a unique title and description', () => {
    expect(homePageSeo.title).not.toBe(assiutPageSeo.title)
    expect(homePageSeo.description).not.toBe(assiutPageSeo.description)
  })

  it('states the Sloty identity: brand, football pitch booking and management, Assiut, Egypt', () => {
    expect(homePageSeo.title).toBe('Sloty | سلوتي لحجز وإدارة ملاعب كرة القدم في أسيوط ومصر')
    for (const term of ['سلوتي', 'Sloty', 'أسيوط', 'مصر', 'حجز وإدارة ملاعب كرة القدم']) {
      expect(homePageSeo.description).toContain(term)
    }
    expect(assiutPageSeo.title).toBe('حجز ملاعب كرة القدم في أسيوط | Sloty')
  })

  it('describes Sloty as Organization, WebSite, and a business SoftwareApplication', () => {
    const nodes = graph(homePageSeo.structuredData?.(ORIGIN) ?? [])
    const software = nodeOfType(nodes, 'SoftwareApplication')

    expect(nodeOfType(nodes, 'Organization')).toMatchObject({
      name: 'Sloty',
      alternateName: 'سلوتي',
      url: 'https://sloty.baronlearning.com/',
      logo: 'https://sloty.baronlearning.com/icons/sloty-512x512.png',
    })
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

  it('contains no invented facts or LocalBusiness claims', () => {
    const serialized = serializeJsonLd([
      ...(homePageSeo.structuredData?.(ORIGIN) ?? []),
      ...(assiutPageSeo.structuredData?.(ORIGIN) ?? []),
    ])

    for (const forbidden of [
      'LocalBusiness',
      'SportsActivityLocation',
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
  })

  it('describes the Assiut page with WebPage about the city and a breadcrumb', () => {
    const nodes = graph(assiutPageSeo.structuredData?.(ORIGIN) ?? [])

    expect(nodeOfType(nodes, 'WebPage')).toMatchObject({
      url: 'https://sloty.baronlearning.com/assiut/',
      about: { '@type': 'City', name: 'أسيوط' },
    })
    expect(nodeOfType(nodes, 'BreadcrumbList')?.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Sloty', item: 'https://sloty.baronlearning.com/' },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'أسيوط',
        item: 'https://sloty.baronlearning.com/assiut/',
      },
    ])
  })
})
