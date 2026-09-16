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

  it('lists booking attempts through the shared endpoint registry with supported filters', async () => {
    mockedApiRequest.mockResolvedValueOnce({
      count: 0,
      next: null,
      previous: null,
      results: [],
    })

    await listBookingAttempts('nasr-club', {
      court: 3,
      outcome: 'REJECTED',
      status: 'REJECTED',
      requested_source: 'SCHEDULE_QUICK_FORM',
    })

    expect(mockedApiRequest).toHaveBeenCalledWith(
      `${apiEndpoints.clubs.bookingAttempts.list(
        'nasr-club',
      )}?court=3&outcome=REJECTED&requested_source=SCHEDULE_QUICK_FORM&status=REJECTED`,
    )
  })

  it('never sends failure_code as a query parameter', async () => {
    mockedApiRequest.mockResolvedValueOnce({
      count: 0,
      next: null,
      previous: null,
      results: [],
    })

    await listBookingAttempts('nasr-club', {
      court: 3,
    })

    const calledUrl = mockedApiRequest.mock.calls[0][0] as string
    expect(calledUrl).not.toContain('failure_code')
  })

  it('passes an abort signal for booking attempt reads', async () => {
    const controller = new AbortController()

    mockedApiRequest.mockResolvedValueOnce({
      count: 0,
      next: null,
      previous: null,
      results: [],
    })

    await listBookingAttempts(
      'nasr-club',
      { page: 2 },
      { signal: controller.signal },
    )

    expect(mockedApiRequest).toHaveBeenCalledWith(
      `${apiEndpoints.clubs.bookingAttempts.list('nasr-club')}?page=2`,
      { signal: controller.signal },
    )
  })

  it('reads booking attempt preserving failure_code on response record and dismisses by id', async () => {
    const mockAttempt = {
      id: 7,
      club: 1,
      court: 3,
      customer_name: 'أحمد',
      customer_phone: '+201000000001',
      requested_start: '2026-08-30T18:00:00+03:00',
      requested_end: '2026-08-30T19:00:00+03:00',
      requested_recurring: false,
      outcome: 'REJECTED' as const,
      resolution: 'UNRESOLVED' as const,
      status: 'REJECTED' as const,
      failure_code: 'BOOKING_SLOT_UNAVAILABLE',
      failure_details: { reason: 'slot conflict' },
      created: '2026-08-30T10:00:00Z',
      modified: '2026-08-30T10:00:00Z',
    }

    mockedApiRequest.mockResolvedValueOnce(mockAttempt)
    mockedApiRequest.mockResolvedValueOnce({ ...mockAttempt, status: 'DISMISSED' })

    const result = await getBookingAttempt('nasr-club', 7)
    expect(result.failure_code).toBe('BOOKING_SLOT_UNAVAILABLE')
    expect(result.failure_details).toEqual({ reason: 'slot conflict' })

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
