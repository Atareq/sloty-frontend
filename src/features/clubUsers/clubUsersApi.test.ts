import { describe, expect, it, vi } from 'vitest'
import { apiRequest } from '../../core/api/apiClient'
import { apiEndpoints } from '../../shared/api/apiEndpoints'
import { listClubUsers, updateManagerPermissions } from './clubUsersApi'

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
})
