import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getClub } from '../clubsApi'
import { fetchEgyptLocations } from '../../locations/egyptLocationsApi'
import { ClubFormPage } from './ClubFormPage'

vi.mock('../clubsApi', () => ({
  createClub: vi.fn(),
  getClub: vi.fn(),
  updateClub: vi.fn(),
}))

vi.mock('../../locations/egyptLocationsApi', () => ({
  fetchEgyptLocations: vi.fn(),
}))

const mockedGetClub = vi.mocked(getClub)
const mockedFetchEgyptLocations = vi.mocked(fetchEgyptLocations)

describe('ClubFormPage court-management entry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedFetchEgyptLocations.mockResolvedValue({ governorates: [] })
    mockedGetClub.mockResolvedValue({
      id: 9,
      name: 'برشلونة',
      slug: 'barcelona',
      governorate: 'CAIRO',
      city: 'NASR_CITY',
      is_active: true,
    })
  })

  it('links an edited Club to its existing slug-scoped Courts management page', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/clubs/9']}>
        <Routes>
          <Route element={<ClubFormPage />} path="/admin/clubs/:clubId" />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('link', { name: 'إدارة الملاعب' })).toHaveAttribute(
      'href',
      '/admin/clubs/barcelona/courts',
    )
  })
})
