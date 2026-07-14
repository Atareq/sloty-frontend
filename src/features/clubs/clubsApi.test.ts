import { describe, expect, it, vi } from 'vitest'
import { apiRequest } from '../../core/api/apiClient'
import { apiEndpoints } from '../../shared/api/apiEndpoints'
import { createClub, getClub, listClubs, updateClub } from './clubsApi'

vi.mock('../../core/api/apiClient', () => ({
  apiRequest: vi.fn(),
}))

const mockedApiRequest = vi.mocked(apiRequest)

describe('clubsApi', () => {
  it('uses shared club endpoints for list/detail/create/update calls', async () => {
    mockedApiRequest.mockResolvedValue({})

    await listClubs()
    await getClub(12)
    await createClub({
      name: 'نادي النصر',
      governorate: 'ASSIUT',
      city: 'ASSIUT_MARKAZ',
    })
    await updateClub(12, {
      name: 'نادي النصر',
      governorate: 'ASSIUT',
      city: 'ASSIUT_MARKAZ',
      is_active: true,
    })

    expect(mockedApiRequest).toHaveBeenNthCalledWith(1, apiEndpoints.clubs.list)
    expect(mockedApiRequest).toHaveBeenNthCalledWith(
      2,
      apiEndpoints.clubs.detail(12),
    )
    expect(mockedApiRequest).toHaveBeenNthCalledWith(3, apiEndpoints.clubs.list, {
      method: 'POST',
      body: {
        name: 'نادي النصر',
        governorate: 'ASSIUT',
        city: 'ASSIUT_MARKAZ',
      },
    })
    expect(mockedApiRequest).toHaveBeenNthCalledWith(
      4,
      apiEndpoints.clubs.detail(12),
      {
        method: 'PATCH',
        body: {
          name: 'نادي النصر',
          governorate: 'ASSIUT',
          city: 'ASSIUT_MARKAZ',
          is_active: true,
        },
      },
    )
  })
})
