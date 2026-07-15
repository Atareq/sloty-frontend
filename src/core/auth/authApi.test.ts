import { describe, expect, it, vi } from 'vitest'
import { apiRequest } from '../api/apiClient'
import { apiEndpoints } from '../../shared/api/apiEndpoints'
import { fetchCurrentUserProfile } from './authApi'

vi.mock('../api/apiClient', () => ({
  apiRequest: vi.fn(),
}))

const mockedApiRequest = vi.mocked(apiRequest)

describe('authApi', () => {
  it('fetches the current user profile from the shared me endpoint', async () => {
    mockedApiRequest.mockResolvedValueOnce({
      id: 1,
      username: 'staff-user',
      email: 'staff@example.com',
      first_name: 'أحمد',
      last_name: 'علي',
      phone_number: null,
      is_active: true,
      is_platform_admin: false,
      requires_club_selection: false,
      memberships: [],
    })

    await fetchCurrentUserProfile()

    expect(mockedApiRequest).toHaveBeenCalledWith(apiEndpoints.auth.me)
  })
})
