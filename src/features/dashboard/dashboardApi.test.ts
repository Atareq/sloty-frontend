import { describe, expect, it, vi } from 'vitest'
import { apiRequest } from '../../core/api/apiClient'
import { apiEndpoints } from '../../shared/api/apiEndpoints'
import { getDashboardSummary } from './dashboardApi'

vi.mock('../../core/api/apiClient', () => ({
  apiRequest: vi.fn(),
}))

const mockedApiRequest = vi.mocked(apiRequest)

describe('dashboardApi', () => {
  it('gets dashboard summary with query params', async () => {
    mockedApiRequest.mockResolvedValueOnce({})

    await getDashboardSummary('nasr-club', {
      date_from: '2026-07-01',
      date_to: '2026-07-15',
    })

    expect(mockedApiRequest).toHaveBeenCalledWith(
      `${apiEndpoints.clubs.dashboard.summary('nasr-club')}?date_from=2026-07-01&date_to=2026-07-15`,
    )
  })
})
