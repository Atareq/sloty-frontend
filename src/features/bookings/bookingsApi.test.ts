import { describe, expect, it, vi } from 'vitest'
import { apiRequest } from '../../core/api/apiClient'
import { apiEndpoints } from '../../shared/api/apiEndpoints'
import { listBookings } from './bookingsApi'

vi.mock('../../core/api/apiClient', () => ({
  apiRequest: vi.fn(),
}))

const mockedApiRequest = vi.mocked(apiRequest)

describe('bookingsApi', () => {
  it('lists bookings through the shared endpoint registry', async () => {
    mockedApiRequest.mockResolvedValueOnce({
      count: 0,
      next: null,
      previous: null,
      results: [],
    })

    await listBookings('nasr-club')

    expect(mockedApiRequest).toHaveBeenCalledWith(
      apiEndpoints.clubs.bookings.list('nasr-club'),
    )
  })

  it('sends status, date, and needs_action filters', async () => {
    mockedApiRequest.mockResolvedValueOnce({
      count: 0,
      next: null,
      previous: null,
      results: [],
    })

    await listBookings('nasr-club', {
      date: '2026-07-21',
      needs_action: true,
      status: 'HOLD',
    })

    expect(mockedApiRequest).toHaveBeenCalledWith(
      `${apiEndpoints.clubs.bookings.list(
        'nasr-club',
      )}?date=2026-07-21&needs_action=true&status=HOLD`,
    )
  })

  it('keeps false and zero query values', async () => {
    mockedApiRequest.mockResolvedValueOnce({
      count: 0,
      next: null,
      previous: null,
      results: [],
    })

    await listBookings('nasr-club', {
      needs_action: false,
      remaining_amount_gt: 0,
    })

    expect(mockedApiRequest).toHaveBeenCalledWith(
      `${apiEndpoints.clubs.bookings.list(
        'nasr-club',
      )}?needs_action=false&remaining_amount_gt=0`,
    )
  })

  it('skips empty query params', async () => {
    mockedApiRequest.mockResolvedValueOnce({
      count: 0,
      next: null,
      previous: null,
      results: [],
    })

    await listBookings('nasr-club', {
      date: '',
      needs_action: '',
      status: '',
    })

    expect(mockedApiRequest).toHaveBeenCalledWith(
      apiEndpoints.clubs.bookings.list('nasr-club'),
    )
  })

  it('supports page, court, overdue, ended, and hold_expiring filters', async () => {
    mockedApiRequest.mockResolvedValueOnce({
      count: 0,
      next: null,
      previous: null,
      results: [],
    })

    await listBookings('nasr-club', {
      court: 3,
      ended: true,
      hold_expiring: true,
      overdue: true,
      page: 2,
    })

    expect(mockedApiRequest).toHaveBeenCalledWith(
      `${apiEndpoints.clubs.bookings.list(
        'nasr-club',
      )}?court=3&ended=true&hold_expiring=true&overdue=true&page=2`,
    )
  })
})
