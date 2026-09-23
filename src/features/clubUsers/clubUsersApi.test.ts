import { describe, expect, it, vi } from 'vitest'
import { apiRequest } from '../../core/api/apiClient'
import { apiEndpoints } from '../../shared/api/apiEndpoints'
import {
  createClubStaff,
  listClubUsers,
  updateClubUser,
  updateStaffCourts,
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

  it('lists club staff through confirmed clubs/{slug}/staff/ endpoint', async () => {
    mockedApiRequest.mockResolvedValueOnce({ results: [], count: 0, next: null, previous: null })

    await listClubUsers('nasr-club')

    expect(mockedApiRequest).toHaveBeenCalledWith(
      apiEndpoints.clubs.staff.list('nasr-club'),
    )
  })

  it('builds supported active and search filters for staff', async () => {
    mockedApiRequest.mockResolvedValueOnce({ results: [], count: 0, next: null, previous: null })

    await listClubUsers('nasr-club', {
      is_active: true,
      search: '  ahmed  ',
    })

    expect(mockedApiRequest).toHaveBeenCalledWith(
      `${apiEndpoints.clubs.staff.list('nasr-club')}?is_active=true&search=ahmed`,
    )
  })

  it('creates club staff user with confirmed payload on clubs/{slug}/staff/', async () => {
    mockedApiRequest.mockResolvedValueOnce({
      id: 42,
      username: 'staff-1',
      profile_id: 42,
      first_name: 'أحمد',
      last_name: 'علي',
      is_active: true,
    })

    await createClubStaff('nasr-club', {
      username: ' staff-1 ',
      password: 'password123',
      first_name: ' أحمد ',
      last_name: ' علي ',
      email: ' staff@example.com ',
      phone_number: ' +201000000000 ',
      court_ids: [1, 2],
    })

    expect(mockedApiRequest).toHaveBeenCalledWith(
      apiEndpoints.clubs.staff.list('nasr-club'),
      {
        method: 'POST',
        body: {
          phone_number: '+201000000000',
          password: 'password123',
          email: 'staff@example.com',
          first_name: 'أحمد',
          last_name: 'علي',
          court_ids: [1, 2],
        },
      },
    )
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

  it('updates staff court assignments through PUT clubs/{slug}/staff/{profileId}/courts/', async () => {
    mockedApiRequest.mockResolvedValueOnce(undefined)

    await updateStaffCourts('nasr-club', 42, [3, 4])

    expect(mockedApiRequest).toHaveBeenCalledWith(
      apiEndpoints.clubs.staff.courts('nasr-club', 42),
      {
        method: 'PUT',
        body: {
          court_ids: [3, 4],
        },
      },
    )
  })
})
