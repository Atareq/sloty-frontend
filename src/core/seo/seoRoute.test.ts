import { describe, expect, it } from 'vitest'
import { privateAppSeo } from './seoConfig'
import { resolveRouteSeo, routeSeo } from './seoRoute'
import type { IndexablePageSeo, NoindexPageSeo } from './seo.types'

const publicSeo: IndexablePageSeo = {
  robots: 'index',
  title: 'Public',
  description: 'Public page',
  canonicalPath: '/',
}
const utilitySeo: NoindexPageSeo = { robots: 'noindex', title: 'Utility' }

describe('resolveRouteSeo', () => {
  it('falls back to the private noindex default when no route declares SEO', () => {
    expect(resolveRouteSeo([{ handle: undefined }, { handle: { other: true } }])).toBe(
      privateAppSeo,
    )
    expect(privateAppSeo.robots).toBe('noindex')
  })

  it('uses the deepest route that declares SEO', () => {
    expect(
      resolveRouteSeo([
        { handle: routeSeo(publicSeo) },
        { handle: routeSeo(utilitySeo) },
        { handle: undefined },
      ]),
    ).toBe(utilitySeo)
  })
})
