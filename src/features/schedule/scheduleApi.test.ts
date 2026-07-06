import { describe, expect, it, vi } from 'vitest'
import { apiRequest } from '../../core/api/apiClient'
import { apiEndpoints } from '../../shared/api/apiEndpoints'
import {
  buildBookingListPath,
  createBooking,
  listBookingsForCourtDay,
} from './scheduleApi'

vi.mock('../../core/api/apiClient', () => ({
  apiRequest: vi.fn(),
}))

const mockedApiRequest = vi.mocked(apiRequest)

describe('scheduleApi', () => {
  it('builds booking list path with court and date filters', () => {
    expect(
      buildBookingListPath('nasr-club', { court: 3, date: '2026-07-02' }),
    ).toBe('clubs/nasr-club/bookings/?court=3&date=2026-07-02')
  })

  it('uses the shared booking endpoint registry for day/court requests', async () => {
    mockedApiRequest.mockResolvedValueOnce({
      count: 0,
      next: null,
      previous: null,
      results: [],
    })

    await listBookingsForCourtDay('nasr-club', {
      court: 3,
      date: '2026-07-02',
    })

    expect(mockedApiRequest).toHaveBeenCalledWith(
      `${apiEndpoints.clubs.bookings.list('nasr-club')}?court=3&date=2026-07-02`,
    )
  })

  it('creates bookings through the shared booking list endpoint with POST', async () => {
    const payload = {
      court: 3,
      customer_name: 'أحمد علي',
      customer_phone: '01000000000',
      start_time: '2026-07-02T18:00:00',
      end_time: '2026-07-02T19:00:00',
      source: 'MANUAL' as const,
    }

    mockedApiRequest.mockResolvedValueOnce({
      id: 20,
      court: 3,
      customer_name: 'أحمد علي',
      customer_phone: '01000000000',
      start_time: '2026-07-02T18:00:00',
      end_time: '2026-07-02T19:00:00',
      status: 'CONFIRMED',
    })

    await createBooking('nasr-club', payload)

    expect(mockedApiRequest).toHaveBeenCalledWith(
      apiEndpoints.clubs.bookings.list('nasr-club'),
      {
        method: 'POST',
        body: payload,
      },
    )
  })
})
