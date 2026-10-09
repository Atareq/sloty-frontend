import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiRequest } from '../../core/api/apiClient'
import { apiEndpoints } from '../../shared/api/apiEndpoints'
import {
  createCourt,
  deleteCourtImage,
  fetchAllCourts,
  getCourt,
  getCourtMonthlyStatistics,
  listCourtImages,
  listCourts,
  replaceCourtPrimaryImage,
  updateCourt,
  uploadCourtImage,
} from './courtsApi'
import type { CourtImage } from './courts.types'

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

  describe('court images', () => {
    function courtImage(id: number, position: number): CourtImage {
      return {
        id,
        position,
        image: {
          id: id + 100,
          display_url: `https://images.sloty.test/images/${id}/display.webp`,
          thumbnail_url: `https://images.sloty.test/images/${id}/thumbnail.webp`,
          width: 1200,
          height: 800,
        },
      }
    }

    const courtImageFile = new File(['court'], 'court.png', { type: 'image/png' })

    it('keeps Court create and update as JSON without any image field', async () => {
      mockedApiRequest.mockResolvedValue({})

      await createCourt('nasr-club', courtPayload)
      await updateCourt('nasr-club', 3, courtPayload)

      for (const call of mockedApiRequest.mock.calls) {
        const body = (call[1] as { body?: unknown }).body

        expect(body).not.toBeInstanceOf(FormData)
        expect(body).toEqual(courtPayload)
        expect(body).not.toHaveProperty('image')
      }
    })

    it('lists Court images from the Court images endpoint', async () => {
      mockedApiRequest.mockResolvedValueOnce([courtImage(1, 0)])

      await expect(listCourtImages('nasr-club', 3)).resolves.toEqual([
        courtImage(1, 0),
      ])
      expect(mockedApiRequest).toHaveBeenCalledWith(
        'clubs/nasr-club/courts/3/images/',
      )
    })

    it('uploads one image as multipart FormData with only the image field', async () => {
      mockedApiRequest.mockResolvedValueOnce(courtImage(9, 0))

      await uploadCourtImage('nasr-club', 3, courtImageFile)

      const [path, options] = mockedApiRequest.mock.calls[0] as [
        string,
        { method: string; body: FormData },
      ]

      expect(path).toBe('clubs/nasr-club/courts/3/images/')
      expect(options.method).toBe('POST')
      expect(options.body).toBeInstanceOf(FormData)
      expect(options.body.get('image')).toBe(courtImageFile)
      expect(Array.from(options.body.keys())).toEqual(['image'])
    })

    it('deletes one Court image relation', async () => {
      mockedApiRequest.mockResolvedValueOnce(undefined)

      await deleteCourtImage('nasr-club', 3, 4)

      expect(mockedApiRequest).toHaveBeenCalledWith(
        'clubs/nasr-club/courts/3/images/4/',
        { method: 'DELETE' },
      )
    })

    it('replaces the primary image by uploading first, then detaching every previous image', async () => {
      mockedApiRequest
        .mockResolvedValueOnce([courtImage(1, 0), courtImage(2, 1)])
        .mockResolvedValueOnce(courtImage(9, 2))
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined)

      await expect(
        replaceCourtPrimaryImage('nasr-club', 3, courtImageFile),
      ).resolves.toEqual(courtImage(9, 2))

      const calls = mockedApiRequest.mock.calls.map(([path, options]) => [
        path,
        (options as { method?: string } | undefined)?.method ?? 'GET',
      ])

      expect(calls).toEqual([
        ['clubs/nasr-club/courts/3/images/', 'GET'],
        ['clubs/nasr-club/courts/3/images/', 'POST'],
        ['clubs/nasr-club/courts/3/images/1/', 'DELETE'],
        ['clubs/nasr-club/courts/3/images/2/', 'DELETE'],
      ])
    })

    it('never detaches the existing image when the upload fails', async () => {
      const uploadError = new Error('upload failed')
      mockedApiRequest
        .mockResolvedValueOnce([courtImage(1, 0)])
        .mockRejectedValueOnce(uploadError)

      await expect(
        replaceCourtPrimaryImage('nasr-club', 3, courtImageFile),
      ).rejects.toBe(uploadError)

      expect(mockedApiRequest).toHaveBeenCalledTimes(2)
      expect(
        mockedApiRequest.mock.calls.some(
          ([, options]) =>
            (options as { method?: string } | undefined)?.method === 'DELETE',
        ),
      ).toBe(false)
    })
  })

  it('fetches court monthly statistics using the correct endpoint and query params', async () => {
    const mockStats = {
      month: '2026-09',
      total_income: '5250.00',
      total_bookings: 42,
    }
    mockedApiRequest.mockResolvedValueOnce(mockStats)

    const abortController = new AbortController()
    const stats = await getCourtMonthlyStatistics('nasr-club', 3, '2026-09', {
      signal: abortController.signal,
    })

    expect(stats).toEqual(mockStats)
    expect(mockedApiRequest).toHaveBeenCalledWith(
      'clubs/nasr-club/courts/3/monthly-statistics/?month=2026-09',
      {
        signal: abortController.signal,
      },
    )
  })
})
