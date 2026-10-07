import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiRequest } from '../../core/api/apiClient'
import {
  buildPublicCourtDiscoveryPath,
  buildPublicCourtSearchPath,
  listPublicCourts,
  searchPublicCourts,
} from './publicDiscoveryApi'
import type { PublicCourtDiscoveryResponse } from './publicDiscovery.types'

vi.mock('../../core/api/apiClient', () => ({
  apiRequest: vi.fn(),
}))

const mockedApiRequest = vi.mocked(apiRequest)

/** Frozen target contract: GET /api/v1/public/courts/?page=1 */
const contractPage: PublicCourtDiscoveryResponse = {
  count: 1,
  next: null,
  previous: null,
  results: [
    {
      court_id: 1,
      court_name: 'Testing Main Court',
      club_slug: 'testing',
      club_name: 'Testing Club',
      governorate: 'القاهرة',
      city: 'القاهرة',
      address: 'شارع عباس العقاد',
      image_url: 'https://images.example/courts/1.jpg',
    },
  ],
}

describe('publicDiscoveryApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('builds the page query on the public courts endpoint without a city filter', () => {
    expect(buildPublicCourtDiscoveryPath({ page: 1 })).toBe('public/courts/?page=1')
    expect(buildPublicCourtDiscoveryPath({ page: 3 })).toBe('public/courts/?page=3')
  })

  it('builds the Phase 2/3/4/5 search path for Court-only, day-only, Court + day, and combined Court + day + up to 5 sorted times', () => {
    expect(
      buildPublicCourtSearchPath({
        date: null,
        times: [],
        courtId: 12,
        page: 1,
      }),
    ).toBe('public/courts/search/?court_id=12&page=1')

    expect(
      buildPublicCourtSearchPath({
        date: '2026-10-09',
        times: [],
        page: 1,
      }),
    ).toBe('public/courts/search/?date=2026-10-09&page=1')

    expect(
      buildPublicCourtSearchPath({
        date: '2026-10-09',
        times: [],
        courtId: 12,
        page: 1,
      }),
    ).toBe('public/courts/search/?court_id=12&date=2026-10-09&page=1')

    expect(
      buildPublicCourtSearchPath({
        date: '2026-10-09',
        times: ['18:00', '10:00', '11:00'],
        page: 2,
      }),
    ).toBe('public/courts/search/?date=2026-10-09&times=10:00,11:00,18:00&page=2')

    expect(
      buildPublicCourtSearchPath({
        date: '2026-10-09',
        times: ['18:00', '10:00'],
        courtId: 12,
        page: 2,
      }),
    ).toBe(
      'public/courts/search/?court_id=12&date=2026-10-09&times=10:00,18:00&page=2',
    )

    expect(
      buildPublicCourtSearchPath({
        date: '2026-10-09',
        times: ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00'],
        page: 1,
      }),
    ).toBe(
      'public/courts/search/?date=2026-10-09&times=08:00,09:00,10:00,11:00,12:00&page=1',
    )
  })

  it('requests anonymously and returns the mapped page', async () => {
    mockedApiRequest.mockResolvedValueOnce(contractPage)
    const controller = new AbortController()

    const result = await listPublicCourts(
      { page: 1 },
      { signal: controller.signal },
    )

    expect(mockedApiRequest).toHaveBeenCalledWith(
      'public/courts/?page=1',
      {
        method: 'GET',
        signal: controller.signal,
        skipAuthRefresh: true,
        omitAuth: true,
      },
    )
    expect(result).toEqual({
      courts: [
        {
          key: 'testing:1',
          courtId: 1,
          courtName: 'Testing Main Court',
          clubSlug: 'testing',
          clubName: 'Testing Club',
          addressLabel: 'شارع عباس العقاد، القاهرة',
          imageUrl: 'https://images.example/courts/1.jpg',
          matchingTimes: [],
        },
      ],
      totalCount: 1,
      hasNextPage: false,
    })
  })

  it('searches anonymously with date and optional times and maps matching_times', async () => {
    mockedApiRequest.mockResolvedValueOnce({
      ...contractPage,
      results: [
        {
          ...contractPage.results[0]!,
          matching_times: ['10:00', '18:00'],
        },
      ],
    })
    const controller = new AbortController()

    const result = await searchPublicCourts(
      {
        date: '2026-10-09',
        times: ['10:00', '18:00'],
        page: 1,
      },
      { signal: controller.signal },
    )

    expect(mockedApiRequest).toHaveBeenCalledWith(
      'public/courts/search/?date=2026-10-09&times=10:00,18:00&page=1',
      {
        method: 'GET',
        signal: controller.signal,
        skipAuthRefresh: true,
        omitAuth: true,
      },
    )
    expect(result.courts).toHaveLength(1)
    expect(result.courts[0]?.courtName).toBe('Testing Main Court')
    expect(result.courts[0]?.matchingTimes).toEqual(['10:00', '18:00'])
  })

  it('searches anonymously by Court identity (court_id) for Phase 4 Court-only filtering', async () => {
    mockedApiRequest.mockResolvedValueOnce(contractPage)
    const controller = new AbortController()

    const result = await searchPublicCourts(
      {
        date: null,
        times: [],
        courtId: 1,
        page: 1,
      },
      { signal: controller.signal },
    )

    expect(mockedApiRequest).toHaveBeenCalledWith(
      'public/courts/search/?court_id=1&page=1',
      {
        method: 'GET',
        signal: controller.signal,
        skipAuthRefresh: true,
        omitAuth: true,
      },
    )
    expect(result.courts).toHaveLength(1)
    expect(result.courts[0]?.courtId).toBe(1)
  })

  it('searches anonymously with combined Court + date + times criteria for Phase 5', async () => {
    mockedApiRequest.mockResolvedValueOnce({
      ...contractPage,
      results: [
        {
          ...contractPage.results[0]!,
          court_id: 12,
          matching_times: ['11:00', '18:00'],
        },
      ],
    })
    const controller = new AbortController()

    const result = await searchPublicCourts(
      {
        date: '2026-10-09',
        times: ['10:00', '11:00', '18:00'],
        courtId: 12,
        page: 1,
      },
      { signal: controller.signal },
    )

    expect(mockedApiRequest).toHaveBeenCalledWith(
      'public/courts/search/?court_id=12&date=2026-10-09&times=10:00,11:00,18:00&page=1',
      {
        method: 'GET',
        signal: controller.signal,
        skipAuthRefresh: true,
        omitAuth: true,
      },
    )
    expect(result.courts).toHaveLength(1)
    expect(result.courts[0]?.courtId).toBe(12)
    expect(result.courts[0]?.matchingTimes).toEqual(['11:00', '18:00'])
  })

  it('propagates API failures to the caller', async () => {
    mockedApiRequest.mockRejectedValueOnce(new Error('Not found'))

    await expect(
      listPublicCourts({ page: 1 }),
    ).rejects.toThrow('Not found')
  })
})
