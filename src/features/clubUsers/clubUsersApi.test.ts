import { describe, expect, it, vi } from 'vitest'
import { apiRequest } from '../../core/api/apiClient'
import { apiEndpoints } from '../../shared/api/apiEndpoints'
import { listClubUsers } from './clubUsersApi'

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
})
