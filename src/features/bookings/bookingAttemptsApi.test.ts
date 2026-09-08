import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiRequest } from '../../core/api/apiClient'
import { apiEndpoints } from '../../shared/api/apiEndpoints'
import {
  dismissBookingAttempt,
  getBookingAttempt,
  listBookingAttempts,
} from './bookingAttemptsApi'

vi.mock('../../core/api/apiClient', () => ({
  apiRequest: vi.fn(),
}))

const mockedApiRequest = vi.mocked(apiRequest)

describe('bookingAttemptsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lists booking attempts through the shared endpoint registry', async () => {
    mockedApiRequest.mockResolvedValueOnce({
      count: 0,
      next: null,
      previous: null,
      results: [],
    })

    await listBookingAttempts('nasr-club', {
      court: 3,
      failure_code: 'BOOKING_SLOT_UNAVAILABLE',
      outcome: 'REJECTED',
      status: 'REJECTED',
    })

    expect(mockedApiRequest).toHaveBeenCalledWith(
      `${apiEndpoints.clubs.bookingAttempts.list(
        'nasr-club',
      )}?court=3&failure_code=BOOKING_SLOT_UNAVAILABLE&outcome=REJECTED&status=REJECTED`,
    )
  })

  it('passes an abort signal for booking attempt reads', async () => {
    const controller = new AbortController()

    mockedApiRequest.mockResolvedValueOnce({
      count: 0,
      next: null,
      previous: null,
      results: [],
    })

    await listBookingAttempts('nasr-club', { page: 2 }, {
      signal: controller.signal,
    })

    expect(mockedApiRequest).toHaveBeenCalledWith(
      `${apiEndpoints.clubs.bookingAttempts.list('nasr-club')}?page=2`,
      { signal: controller.signal },
    )
  })

  it('reads and dismisses one booking attempt by id', async () => {
    mockedApiRequest.mockResolvedValueOnce({ id: 7 })
    mockedApiRequest.mockResolvedValueOnce({ id: 7, status: 'DISMISSED' })

    await getBookingAttempt('nasr-club', 7)
    await dismissBookingAttempt('nasr-club', 7)

    expect(mockedApiRequest).toHaveBeenNthCalledWith(
      1,
      apiEndpoints.clubs.bookingAttempts.detail('nasr-club', 7),
    )
    expect(mockedApiRequest).toHaveBeenNthCalledWith(
      2,
      apiEndpoints.clubs.bookingAttempts.dismiss('nasr-club', 7),
      { method: 'POST', body: {} },
    )
  })
})
