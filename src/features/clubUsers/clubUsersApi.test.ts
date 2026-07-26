import { describe, expect, it, vi } from 'vitest'
import { apiRequest } from '../../core/api/apiClient'
import { apiEndpoints } from '../../shared/api/apiEndpoints'
import {
  createClubMembership,
  listClubUsers,
  updateManagerPermissions,
} from './clubUsersApi'

vi.mock('../../core/api/apiClient', () => ({
  apiRequest: vi.fn(),
}))

const mockedApiRequest = vi.mocked(apiRequest)

describe('clubUsersApi', () => {
  it('lists club users through the club-scoped users endpoint', async () => {
    mockedApiRequest.mockResolvedValueOnce([])

    await listClubUsers('nasr-club')

    expect(mockedApiRequest).toHaveBeenCalledWith(
      apiEndpoints.clubs.users.list('nasr-club'),
    )
  })

  it('builds supported role, court, active, and search filters', async () => {
    mockedApiRequest.mockResolvedValueOnce([])

    await listClubUsers('nasr-club', {
      role: 'STAFF',
      court: 3,
      is_active: true,
      search: '  ahmed  ',
    })

    expect(mockedApiRequest).toHaveBeenCalledWith(
      `${apiEndpoints.clubs.users.list('nasr-club')}?role=STAFF&court=3&is_active=true&search=ahmed`,
    )
  })

  it('patches manager permissions through the membership detail endpoint', async () => {
    mockedApiRequest.mockResolvedValueOnce({ id: 1 })

    await updateManagerPermissions('nasr-club', 102, {
      manager_can_settle_transactions: true,
      manager_can_change_pricing: false,
      can_manage_settlements: true,
      can_change_pricing: true,
      role: 'MANAGER',
    } as never)

    expect(mockedApiRequest).toHaveBeenCalledWith(
      apiEndpoints.clubs.memberships.detail('nasr-club', 102),
      {
        method: 'PATCH',
        body: {
          manager_can_settle_transactions: true,
          manager_can_change_pricing: false,
        },
      },
    )
    expect(mockedApiRequest).not.toHaveBeenCalledWith(
      apiEndpoints.clubs.detail('nasr-club'),
      expect.anything(),
    )
  })

  it('creates a new manager membership with user and manager permission fields', async () => {
    mockedApiRequest.mockResolvedValueOnce({ id: 2 })

    await createClubMembership('nasr-club', {
      user: {
        username: ' manager ',
        email: '',
        password: 'secret123',
        first_name: ' منى ',
        last_name: ' مدير ',
        phone_number: ' +201000000002 ',
      },
      role: 'MANAGER',
      court: 7,
      manager_can_settle_transactions: true,
      manager_can_change_pricing: false,
      can_manage_settlements: true,
      can_change_pricing: true,
    } as never)

    expect(mockedApiRequest).toHaveBeenCalledWith(
      apiEndpoints.clubs.memberships.list('nasr-club'),
      {
        method: 'POST',
        body: {
          user: {
            username: 'manager',
            email: undefined,
            password: 'secret123',
            first_name: 'منى',
            last_name: 'مدير',
            phone_number: '+201000000002',
          },
          role: 'MANAGER',
          court: null,
          manager_can_settle_transactions: true,
          manager_can_change_pricing: false,
        },
      },
    )
  })

  it('creates an existing manager membership with user_id', async () => {
    mockedApiRequest.mockResolvedValueOnce({ id: 2 })

    await createClubMembership('nasr-club', {
      user_id: 55,
      role: 'MANAGER',
      manager_can_settle_transactions: false,
      manager_can_change_pricing: true,
    })

    expect(mockedApiRequest).toHaveBeenCalledWith(
      apiEndpoints.clubs.memberships.list('nasr-club'),
      {
        method: 'POST',
        body: {
          user_id: 55,
          role: 'MANAGER',
          court: null,
          manager_can_settle_transactions: false,
          manager_can_change_pricing: true,
        },
      },
    )
  })

  it('creates a staff membership with court and without manager permission fields', async () => {
    mockedApiRequest.mockResolvedValueOnce({ id: 3 })

    await createClubMembership('nasr-club', {
      user: {
        username: 'staff',
        password: 'secret123',
        first_name: 'سامي',
        last_name: 'موظف',
      },
      role: 'STAFF',
      court: 7,
      manager_can_settle_transactions: true,
      manager_can_change_pricing: true,
      can_manage_working_hours: true,
    } as never)

    expect(mockedApiRequest).toHaveBeenCalledWith(
      apiEndpoints.clubs.memberships.list('nasr-club'),
      {
        method: 'POST',
        body: {
          user: {
            username: 'staff',
            email: undefined,
            password: 'secret123',
            first_name: 'سامي',
            last_name: 'موظف',
            phone_number: undefined,
          },
          role: 'STAFF',
          court: 7,
        },
      },
    )
    expect(mockedApiRequest).not.toHaveBeenCalledWith(
      apiEndpoints.clubs.detail('nasr-club'),
      expect.anything(),
    )
  })
})
