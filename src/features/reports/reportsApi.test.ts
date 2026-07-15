import { describe, expect, it, vi } from 'vitest'
import { apiRequest } from '../../core/api/apiClient'
import { apiEndpoints } from '../../shared/api/apiEndpoints'
import { getReports } from './reportsApi'

vi.mock('../../core/api/apiClient', () => ({
  apiRequest: vi.fn(),
}))

const mockedApiRequest = vi.mocked(apiRequest)

describe('reportsApi', () => {
  it('gets reports with filters', async () => {
    mockedApiRequest.mockResolvedValueOnce({})

    await getReports('nasr-club', {
      date_from: '2026-07-01',
      date_to: '2026-07-15',
      court: 3,
      staff: 5,
      status: 'COMPLETED',
      payment_method: 'CASH',
    })

    expect(mockedApiRequest).toHaveBeenCalledWith(
      `${apiEndpoints.clubs.reports.list('nasr-club')}?date_from=2026-07-01&date_to=2026-07-15&court=3&staff=5&status=COMPLETED&payment_method=CASH`,
    )
  })
})
