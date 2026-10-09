import { describe, expect, it } from 'vitest'
import {
  mapDiscoveryCourtPageToOptionPage,
  mapDiscoveryCourtToOption,
  mapMatchingTimes,
  mapPublicCourtDiscoveryItem,
  mapPublicCourtDiscoveryResponse,
} from './publicDiscovery.mappers'
import type { PublicCourtDiscoveryItemResponse } from './publicDiscovery.types'

function makeItem(
  overrides: Partial<PublicCourtDiscoveryItemResponse> = {},
): PublicCourtDiscoveryItemResponse {
  return {
    court_id: 1,
    court_name: 'Testing Main Court',
    club_slug: 'testing',
    club_name: 'Testing Club',
    governorate: 'القاهرة',
    city: 'القاهرة',
    address: 'شارع عباس العقاد',
    image_url: 'https://images.example/courts/1.jpg',
    ...overrides,
  }
}

describe('publicDiscovery mappers', () => {
  it('keeps an absolute https image URL from Backend', () => {
    expect(mapPublicCourtDiscoveryItem(makeItem()).imageUrl).toBe(
      'https://images.example/courts/1.jpg',
    )
  })

  it('maps a missing, blank, relative, or non-http image to null', () => {
    for (const imageUrl of [null, '', '   ', '/media/court.jpg', 'javascript:alert(1)', 'data:image/png;base64,AAAA']) {
      expect(mapPublicCourtDiscoveryItem(makeItem({ image_url: imageUrl })).imageUrl)
        .toBeNull()
    }
  })

  it('maps multiple real Backend images when provided and omits invalid ones', () => {
    const mapped = mapPublicCourtDiscoveryItem(
      makeItem({
        image_url: 'https://images.example/courts/1.jpg',
        images: [
          'https://images.example/courts/1.jpg',
          { image_url: 'https://images.example/courts/2.jpg' },
          '/relative/ignored.jpg',
        ],
      }),
    )

    expect(mapped.imageUrl).toBe('https://images.example/courts/1.jpg')
    expect(mapped.images).toEqual([
      'https://images.example/courts/1.jpg',
      'https://images.example/courts/2.jpg',
    ])
  })

  it('builds the address from real fields without repeating a place name', () => {
    expect(mapPublicCourtDiscoveryItem(makeItem()).addressLabel).toBe(
      'شارع عباس العقاد، القاهرة',
    )
    expect(
      mapPublicCourtDiscoveryItem(makeItem({ address: 'شارع عباس العقاد، القاهرة' }))
        .addressLabel,
    ).toBe('شارع عباس العقاد، القاهرة')
    expect(
      mapPublicCourtDiscoveryItem(makeItem({ city: 'مدينة نصر' })).addressLabel,
    ).toBe('شارع عباس العقاد، مدينة نصر، القاهرة')
  })

  it('falls back to city and governorate when the address is empty, and to null when nothing is set', () => {
    expect(
      mapPublicCourtDiscoveryItem(makeItem({ address: '' })).addressLabel,
    ).toBe('القاهرة')
    expect(
      mapPublicCourtDiscoveryItem(
        makeItem({ address: null, city: null, governorate: null }),
      ).addressLabel,
    ).toBeNull()
  })

  it('normalizes and deduplicates matching_times while ignoring unrelated availability fields', () => {
    expect(mapMatchingTimes(undefined)).toEqual([])
    expect(mapMatchingTimes(null)).toEqual([])
    expect(
      mapMatchingTimes([
        '10:00',
        '18:00:00',
        '10:00',
        '2026-10-09T19:00:00',
        'invalid',
        '25:00',
      ]),
    ).toEqual(['10:00', '18:00', '19:00'])

    const rawWithExtraBackendFields = {
      ...makeItem({ matching_times: ['10:00', '18:00'] }),
      available_times: ['08:00', '22:00'],
      slots: [{ start_time: '09:00', availability: 'AVAILABLE' }],
    } as PublicCourtDiscoveryItemResponse

    const mapped = mapPublicCourtDiscoveryItem(rawWithExtraBackendFields)
    expect(mapped.matchingTimes).toEqual(['10:00', '18:00'])
  })

  it('maps DiscoveryCourt items and pages into Phase 4 DiscoveryCourtOption models', () => {
    const page = mapPublicCourtDiscoveryResponse({
      count: 1,
      next: null,
      previous: null,
      results: [makeItem({ court_id: 12, club_slug: 'champions', court_name: 'ملعب الأبطال', club_name: 'نادي الأبطال' })],
    })

    expect(mapDiscoveryCourtToOption(page.courts[0]!)).toEqual({
      key: 'champions:12',
      courtId: 12,
      courtName: 'ملعب الأبطال',
      clubSlug: 'champions',
      clubName: 'نادي الأبطال',
      imageUrl: 'https://images.example/courts/1.jpg',
    })

    expect(mapDiscoveryCourtPageToOptionPage(page)).toEqual({
      options: [
        {
          key: 'champions:12',
          courtId: 12,
          courtName: 'ملعب الأبطال',
          clubSlug: 'champions',
          clubName: 'نادي الأبطال',
          imageUrl: 'https://images.example/courts/1.jpg',
        },
      ],
      totalCount: 1,
      hasNextPage: false,
    })
  })

  it('drops items that cannot link to a public schedule and reports the next page', () => {
    const page = mapPublicCourtDiscoveryResponse({
      count: 23,
      next: 'https://api.example/api/v1/public/courts/?page=2',
      next_page: null,
      previous: null,
      results: [
        makeItem(),
        makeItem({ court_id: 0 }),
        makeItem({ court_id: 2, club_slug: '  ' }),
        makeItem({ court_id: 3, court_name: '' }),
      ],
    } as Parameters<typeof mapPublicCourtDiscoveryResponse>[0])

    expect(page.courts.map((court) => court.key)).toEqual(['testing:1'])
    expect(page.totalCount).toBe(23)
    expect(page.hasNextPage).toBe(true)
  })
})
