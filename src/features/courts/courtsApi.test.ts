import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiRequest } from '../../core/api/apiClient'
import { apiEndpoints } from '../../shared/api/apiEndpoints'
import { createCourt, fetchAllCourts, getCourt, listCourts, updateCourt } from './courtsApi'

vi.mock('../../core/api/apiClient', () => ({
  apiRequest: vi.fn(),
}))

const mockedApiRequest = vi.mocked(apiRequest)

const courtPayload = {
  name: 'ملعب 1',
  sport_type: 'FOOTBALL',
  minimum_deposit: '100.00',
  cancellation_refund_notice_days: 3,
  slot_duration_minutes: 60,
}

describe('courtsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('builds nested court calls through the shared endpoint registry', async () => {
    mockedApiRequest.mockResolvedValue({})

    await listCourts('nasr-club')
    await getCourt('nasr-club', 3)
    await createCourt('nasr-club', courtPayload)
    await updateCourt('nasr-club', 3, {
      ...courtPayload,
      is_active: true,
    })

    expect(mockedApiRequest).toHaveBeenNthCalledWith(
      1,
      apiEndpoints.clubs.courts.list('nasr-club'),
    )
    expect(mockedApiRequest).toHaveBeenNthCalledWith(
      2,
      apiEndpoints.clubs.courts.detail('nasr-club', 3),
    )
    expect(mockedApiRequest).toHaveBeenNthCalledWith(
      3,
      apiEndpoints.clubs.courts.list('nasr-club'),
      {
        method: 'POST',
        body: courtPayload,
      },
    )
    expect(mockedApiRequest).toHaveBeenNthCalledWith(
      4,
      apiEndpoints.clubs.courts.detail('nasr-club', 3),
      {
        method: 'PATCH',
        body: {
          ...courtPayload,
          is_active: true,
        },
      },
    )
  })

  it('ensures court create and update payloads never contain summary or legacy pricing fields (Rule 22)', async () => {
    mockedApiRequest.mockResolvedValue({})

    await createCourt('nasr-club', courtPayload)
    await updateCourt('nasr-club', 3, {
      ...courtPayload,
      is_active: true,
    })

    const postCall = mockedApiRequest.mock.calls.find(
      (call) => (call[1] as { method?: string })?.method === 'POST',
    )
    const patchCall = mockedApiRequest.mock.calls.find(
      (call) => (call[1] as { method?: string })?.method === 'PATCH',
    )

    const postBody = (postCall?.[1] as { body?: Record<string, unknown> })?.body
    const patchBody = (patchCall?.[1] as { body?: Record<string, unknown> })?.body

    for (const body of [postBody, patchBody]) {
      expect(body).toBeDefined()
      expect(body).not.toHaveProperty('pricing_configured')
      expect(body).not.toHaveProperty('minimum_slot_price')
      expect(body).not.toHaveProperty('maximum_slot_price')
      expect(body).not.toHaveProperty('default_price')
    }
  })

  it('supports search query params and nextUrl in listCourts', async () => {
    mockedApiRequest.mockResolvedValue({
      count: 0,
      next: null,
      previous: null,
      results: [],
    })

    await listCourts('nasr-club', { params: { search: 'padel', is_active: true } })
    expect(mockedApiRequest).toHaveBeenCalledWith(
      'clubs/nasr-club/courts/?search=padel&is_active=true',
    )

    await listCourts('nasr-club', {
      nextUrl: 'https://api.sloty.io/api/v1/clubs/nasr-club/courts/?page=2',
    })
    expect(mockedApiRequest).toHaveBeenCalledWith(
      'https://api.sloty.io/api/v1/clubs/nasr-club/courts/?page=2',
    )
  })

  it('fetchAllCourts handles 1 court correctly', async () => {
    mockedApiRequest.mockResolvedValueOnce({
      count: 1,
      next: null,
      previous: null,
      results: [{ id: 1, name: 'Court 1' }],
    })

    const courts = await fetchAllCourts('nasr-club')
    expect(courts).toEqual([{ id: 1, name: 'Court 1' }])
    expect(mockedApiRequest).toHaveBeenCalledTimes(1)
  })

  it('fetchAllCourts handles 50 courts across multiple pages correctly', async () => {
    const page1 = Array.from({ length: 20 }, (_, i) => ({ id: i + 1, name: `Court ${i + 1}` }))
    const page2 = Array.from({ length: 20 }, (_, i) => ({ id: i + 21, name: `Court ${i + 21}` }))
    const page3 = Array.from({ length: 10 }, (_, i) => ({ id: i + 41, name: `Court ${i + 41}` }))

    mockedApiRequest
      .mockResolvedValueOnce({
        count: 50,
        next: 'https://api.sloty.io/api/v1/clubs/nasr-club/courts/?page=2',
        previous: null,
        results: page1,
      })
      .mockResolvedValueOnce({
        count: 50,
        next: 'https://api.sloty.io/api/v1/clubs/nasr-club/courts/?page=3',
        previous: 'https://api.sloty.io/api/v1/clubs/nasr-club/courts/?page=1',
        results: page2,
      })
      .mockResolvedValueOnce({
        count: 50,
        next: null,
        previous: 'https://api.sloty.io/api/v1/clubs/nasr-club/courts/?page=2',
        results: page3,
      })

    const courts = await fetchAllCourts('nasr-club')
    expect(courts).toHaveLength(50)
    expect(courts[0]).toEqual({ id: 1, name: 'Court 1' })
    expect(courts[49]).toEqual({ id: 50, name: 'Court 50' })
    expect(mockedApiRequest).toHaveBeenCalledTimes(3)
  })
})
