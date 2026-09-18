import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiRequest } from '../api/apiClient'
import { apiEndpoints } from '../../shared/api/apiEndpoints'
import { API_BASE_URL } from '../../shared/config/api'
import {
  fetchBackendBuildInfo,
  resetBackendBuildInfoCacheForTests,
} from './systemApi'

vi.mock('../api/apiClient', () => ({
  apiRequest: vi.fn(),
}))

const mockedApiRequest = vi.mocked(apiRequest)

describe('systemApi', () => {
  beforeEach(() => {
    resetBackendBuildInfoCacheForTests()
    mockedApiRequest.mockReset()
  })

  afterEach(() => {
    resetBackendBuildInfoCacheForTests()
  })

  it('resolves the system version path to /api/system/version/', () => {
    expect(new URL(apiEndpoints.systemVersion, API_BASE_URL).pathname).toBe(
      '/api/system/version/',
    )
  })

  it('fetches backend build info once and caches the result', async () => {
    mockedApiRequest.mockResolvedValue({
      service: 'sloty-backend',
      release: 'v0.7.0',
      commit: '91bd3aa28ef00',
    })

    const first = await fetchBackendBuildInfo()
    const second = await fetchBackendBuildInfo()

    expect(first).toEqual({
      service: 'sloty-backend',
      release: 'v0.7.0',
      commit: '91bd3aa28ef00',
      shortCommit: '91bd3aa',
    })
    expect(second).toEqual(first)
    expect(mockedApiRequest).toHaveBeenCalledTimes(1)
    expect(mockedApiRequest).toHaveBeenCalledWith(apiEndpoints.systemVersion, {
      method: 'GET',
      omitAuth: true,
      skipAuthRefresh: true,
    })
  })

  it('returns null without throwing when the version request fails', async () => {
    mockedApiRequest.mockRejectedValue(new Error('network down'))

    await expect(fetchBackendBuildInfo()).resolves.toBeNull()
  })
})
