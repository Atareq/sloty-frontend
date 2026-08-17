import { describe, expect, it, vi } from 'vitest'
import { apiRequest } from '../../core/api/apiClient'
import { apiEndpoints } from '../../shared/api/apiEndpoints'
import {
  createPlatformAdmin,
  getPlatformUser,
  listPlatformUsers,
  updatePlatformUser,
} from './adminUsersApi'

vi.mock('../../core/api/apiClient', () => ({
  apiRequest: vi.fn(),
}))

const mockedApiRequest = vi.mocked(apiRequest)

describe('adminUsersApi', () => {
  it('lists platform users through /users/', async () => {
    mockedApiRequest.mockResolvedValueOnce([])

    await listPlatformUsers()

    expect(mockedApiRequest).toHaveBeenCalledWith(apiEndpoints.users.list)
  })

  it('sends supported server-backed filters to the users endpoint', async () => {
    mockedApiRequest.mockResolvedValueOnce([])

    await listPlatformUsers({
      search: '  ahmed  ',
      account_type: 'CLUB_USER',
      club: 3,
      role: 'STAFF',
      is_active: false,
    })

    expect(mockedApiRequest).toHaveBeenCalledWith(
      `${apiEndpoints.users.list}?search=ahmed&account_type=CLUB_USER&club=3&role=STAFF&is_active=false`,
    )
  })

  it('loads a platform user detail through /users/{id}/', async () => {
    mockedApiRequest.mockResolvedValueOnce({ id: 5 })

    await getPlatformUser(5)

    expect(mockedApiRequest).toHaveBeenCalledWith(
      apiEndpoints.users.detail(5),
    )
  })

  it('creates platform admin accounts through POST /users/', async () => {
    mockedApiRequest.mockResolvedValueOnce({ id: 6 })

    await createPlatformAdmin({
      username: ' admin ',
      password: 'secret123',
      first_name: ' منى ',
      last_name: '',
      email: '',
      phone_number: '+201000000001',
    })

    expect(mockedApiRequest).toHaveBeenCalledWith(apiEndpoints.users.list, {
      method: 'POST',
      body: {
        username: 'admin',
        password: 'secret123',
        first_name: 'منى',
        last_name: undefined,
        email: undefined,
        phone_number: '+201000000001',
        is_active: undefined,
      },
    })
  })

  it('patches platform users only when explicit user update is used', async () => {
    mockedApiRequest.mockResolvedValueOnce({ id: 7 })

    await updatePlatformUser(7, { is_active: false })

    expect(mockedApiRequest).toHaveBeenCalledWith(
      apiEndpoints.users.detail(7),
      {
        method: 'PATCH',
        body: { is_active: false },
      },
    )
  })
})
