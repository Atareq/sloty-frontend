import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiRequest } from '../../core/api/apiClient'
import { apiEndpoints } from '../../shared/api/apiEndpoints'
import { createClub, fetchAllClubs, getClub, listClubs, updateClub } from './clubsApi'

vi.mock('../../core/api/apiClient', () => ({
  apiRequest: vi.fn(),
}))

const mockedApiRequest = vi.mocked(apiRequest)

describe('clubsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

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

  it('supports search query params and nextUrl in listClubs', async () => {
    mockedApiRequest.mockResolvedValue({
      count: 1,
      next: null,
      previous: null,
      results: [],
    })

    await listClubs({ params: { search: 'barcelona' } })
    expect(mockedApiRequest).toHaveBeenCalledWith('clubs/?search=barcelona')

    await listClubs('https://api.sloty.io/api/v1/clubs/?page=2')
    expect(mockedApiRequest).toHaveBeenCalledWith(
      'https://api.sloty.io/api/v1/clubs/?page=2',
    )
  })

  it('fetchAllClubs follows pagination pages until next is null', async () => {
    mockedApiRequest
      .mockResolvedValueOnce({
        count: 3,
        next: 'https://api.sloty.io/api/v1/clubs/?page=2',
        previous: null,
        results: [{ id: 1, name: 'Club 1' }, { id: 2, name: 'Club 2' }],
      })
      .mockResolvedValueOnce({
        count: 3,
        next: null,
        previous: 'https://api.sloty.io/api/v1/clubs/?page=1',
        results: [{ id: 3, name: 'Club 3' }],
      })

    const allClubs = await fetchAllClubs()
    expect(allClubs).toEqual([
      { id: 1, name: 'Club 1' },
      { id: 2, name: 'Club 2' },
      { id: 3, name: 'Club 3' },
    ])
  })
})
