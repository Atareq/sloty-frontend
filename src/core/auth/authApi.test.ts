import { describe, expect, it, vi } from 'vitest'
import { apiRequest } from '../api/apiClient'
import { apiEndpoints } from '../../shared/api/apiEndpoints'
import { changePassword, fetchCurrentUserProfile } from './authApi'

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
      profile_role: 'STAFF',
      account_created_by: { id: 7, name: 'مالك النادي' },
    })

    await fetchCurrentUserProfile()

    expect(mockedApiRequest).toHaveBeenCalledWith(apiEndpoints.auth.me)
  })

  it('supports current user profiles without an account creator', async () => {
    mockedApiRequest.mockResolvedValueOnce({
      id: 1,
      username: 'owner-user',
      email: 'owner@example.com',
      first_name: 'أحمد',
      last_name: 'علي',
      phone_number: null,
      is_active: true,
      profile_role: 'OWNER',
      account_created_by: null,
    })

    await fetchCurrentUserProfile()

    expect(mockedApiRequest).toHaveBeenCalledWith(apiEndpoints.auth.me)
  })

  it('calls passwordChange endpoint with correct payload', async () => {
    mockedApiRequest.mockResolvedValueOnce(undefined)

    const payload = {
      current_password: 'old-password',
      new_password: 'new-password-123',
      new_password_confirmation: 'new-password-123',
    }

    await changePassword(payload)

    expect(mockedApiRequest).toHaveBeenCalledWith(apiEndpoints.auth.passwordChange, {
      method: 'POST',
      body: payload,
    })
  })
})
