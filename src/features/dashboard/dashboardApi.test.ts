import { describe, expect, it, vi } from 'vitest'
import { apiRequest } from '../../core/api/apiClient'
import { apiEndpoints } from '../../shared/api/apiEndpoints'
import { getDashboardSummary } from './dashboardApi'

vi.mock('../../core/api/apiClient', () => ({
  apiRequest: vi.fn(),
}))

const mockedApiRequest = vi.mocked(apiRequest)

describe('dashboardApi', () => {
  it('gets dashboard summary with a date query', async () => {
    mockedApiRequest.mockResolvedValueOnce({})

    await getDashboardSummary('nasr-club', {
      date: '2026-07-21',
    })

    expect(mockedApiRequest).toHaveBeenCalledWith(
      `${apiEndpoints.clubs.dashboard.summary('nasr-club')}?date=2026-07-21`,
    )
  })

  it('builds court, payment, and settlement status query params', async () => {
    mockedApiRequest.mockResolvedValueOnce({})

    await getDashboardSummary('nasr-club', {
      court: 3,
      payment_method: 'CASH',
      settlement_status: 'unsettled',
    })

    expect(mockedApiRequest).toHaveBeenCalledWith(
      `${apiEndpoints.clubs.dashboard.summary(
        'nasr-club',
      )}?court=3&payment_method=CASH&settlement_status=unsettled`,
    )
  })

  it('skips empty query params', async () => {
    mockedApiRequest.mockResolvedValueOnce({})

    await getDashboardSummary('nasr-club', {
      collected_by: '',
      payment_method: '',
      settlement_status: '',
    })

    expect(mockedApiRequest).toHaveBeenCalledWith(
      apiEndpoints.clubs.dashboard.summary('nasr-club'),
    )
  })
})
