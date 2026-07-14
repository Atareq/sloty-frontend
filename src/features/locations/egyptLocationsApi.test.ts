import { describe, expect, it, vi } from 'vitest'
import { apiRequest } from '../../core/api/apiClient'
import { apiEndpoints } from '../../shared/api/apiEndpoints'
import { fetchEgyptLocations } from './egyptLocationsApi'

vi.mock('../../core/api/apiClient', () => ({
  apiRequest: vi.fn(),
}))

const mockedApiRequest = vi.mocked(apiRequest)

describe('egyptLocationsApi', () => {
  it('uses the shared endpoint registry', async () => {
    mockedApiRequest.mockResolvedValueOnce({ governorates: [] })

    await fetchEgyptLocations()

    expect(mockedApiRequest).toHaveBeenCalledWith(apiEndpoints.egyptLocations)
  })
})
