import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchEgyptLocations } from '../../locations/egyptLocationsApi'
import { listClubs } from '../clubsApi'
import { ClubsListPage } from './ClubsListPage'

vi.mock('../clubsApi', () => ({
  listClubs: vi.fn(),
}))

vi.mock('../../locations/egyptLocationsApi', () => ({
  fetchEgyptLocations: vi.fn(),
}))

const mockedListClubs = vi.mocked(listClubs)
const mockedFetchEgyptLocations = vi.mocked(fetchEgyptLocations)

describe('ClubsListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedFetchEgyptLocations.mockResolvedValue({ governorates: [] })
  })

  it('renders initial page and loads more clubs when nextUrl exists', async () => {
    const user = userEvent.setup()

    mockedListClubs
      .mockResolvedValueOnce({
        count: 3,
        next: 'https://api.sloty.io/api/v1/clubs/?page=2',
        previous: null,
        results: [
          {
            id: 1,
            name: 'نادي النصر',
            slug: 'nasr-club',
            is_active: true,
            governorate: 'ASSIUT',
            city: 'ASSIUT_CITY',
          },
        ],
      })
      .mockResolvedValueOnce({
        count: 3,
        next: null,
        previous: 'https://api.sloty.io/api/v1/clubs/?page=1',
        results: [
          {
            id: 2,
            name: 'نادي الأمل',
            slug: 'amal-club',
            is_active: true,
            governorate: 'ASSIUT',
            city: 'ASSIUT_CITY',
          },
        ],
      })

    render(
      <MemoryRouter>
        <ClubsListPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('نادي النصر')).toBeInTheDocument()
    const loadMoreBtn = screen.getByRole('button', { name: 'تحميل المزيد' })
    expect(loadMoreBtn).toBeInTheDocument()

    await user.click(loadMoreBtn)

    expect(mockedListClubs).toHaveBeenCalledWith('https://api.sloty.io/api/v1/clubs/?page=2')
    expect(await screen.findByText('نادي الأمل')).toBeInTheDocument()
    expect(screen.getByText('نادي النصر')).toBeInTheDocument()

    // Next page had next: null, so button should disappear
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'تحميل المزيد' })).not.toBeInTheDocument()
    })
  })
})

