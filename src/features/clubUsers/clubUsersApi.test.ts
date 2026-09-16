import { describe, expect, it, vi } from 'vitest'
import { apiRequest } from '../../core/api/apiClient'
import { apiEndpoints } from '../../shared/api/apiEndpoints'
import {
  createClubStaff,
  listClubUsers,
  updateClubUser,
} from './clubUsersApi'
import { getUserUiState } from './clubUsers.types'

vi.mock('../../core/api/apiClient', () => ({
  apiRequest: vi.fn(),
}))

const mockedApiRequest = vi.mocked(apiRequest)

describe('clubUsersApi', () => {
  it('resolves active and deactivated user UI states', () => {
    expect(getUserUiState({ is_active: true })).toBe('ACTIVE')
    expect(getUserUiState({ is_active: false })).toBe('DEACTIVATED')
    expect(getUserUiState({})).toBe('ACTIVE')
  })

  it('lists club users through users endpoint scoped by club', async () => {
    mockedApiRequest.mockResolvedValueOnce([])

    await listClubUsers('nasr-club')

    expect(mockedApiRequest).toHaveBeenCalledWith(
      `${apiEndpoints.users.list}?club=nasr-club`,
    )
  })

  it('builds supported role, active, and search filters', async () => {
    mockedApiRequest.mockResolvedValueOnce([])

    await listClubUsers('nasr-club', {
      role: 'STAFF',
      is_active: true,
      search: '  ahmed  ',
    })

    expect(mockedApiRequest).toHaveBeenCalledWith(
      `${apiEndpoints.users.list}?club=nasr-club&role=STAFF&is_active=true&search=ahmed`,
    )
  })

  it('creates club staff user with normalized payload', async () => {
    mockedApiRequest.mockResolvedValueOnce({
      id: 42,
      username: 'staff-1',
      first_name: 'أحمد',
      last_name: 'علي',
      is_active: true,
    })

    await createClubStaff({
      username: ' staff-1 ',
      password: 'password123',
      first_name: ' أحمد ',
      last_name: ' علي ',
      email: ' staff@example.com ',
      phone_number: ' +201000000000 ',
    })

    expect(mockedApiRequest).toHaveBeenCalledWith(apiEndpoints.users.list, {
      method: 'POST',
      body: {
        username: 'staff-1',
        password: 'password123',
        first_name: 'أحمد',
        last_name: 'علي',
        email: 'staff@example.com',
        phone_number: '+201000000000',
        is_active: true,
      },
    })
  })

  it('patches a club user through the detail endpoint', async () => {
    mockedApiRequest.mockResolvedValueOnce({
      id: 42,
      username: 'staff-1',
      first_name: 'أحمد',
      last_name: 'علي',
      is_active: false,
    })

    await updateClubUser(42, {
      is_active: false,
    })

    expect(mockedApiRequest).toHaveBeenCalledWith(
      apiEndpoints.users.detail(42),
      {
        method: 'PATCH',
        body: {
          is_active: false,
        },
      },
    )
  })
})
