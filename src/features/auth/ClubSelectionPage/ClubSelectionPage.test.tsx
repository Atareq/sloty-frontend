import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthContextValue } from '../../../core/auth/auth.types'
import { useAuth } from '../../../core/auth/useAuth'
import { ClubSelectionPage } from './ClubSelectionPage'

vi.mock('../../../core/auth/useAuth', () => ({
  useAuth: vi.fn(),
}))

const mockedUseAuth = vi.mocked(useAuth)
const selectClub = vi.fn()

const accessibleClubs = [
  {
    id: 1,
    slug: 'demo-football-club',
    name: 'Demo Football Club',
    governorate: 'ASSIUT',
    city: 'ASSIUT_MARKAZ',
    address: 'Demo detailed address',
    is_active: true,
  },
  {
    id: 2,
    slug: 'second-club',
    name: 'Second Club',
    governorate: 'ASSIUT',
    city: 'ASSIUT_CITY',
    address: 'Second address',
    is_active: true,
  },
]

const authValue: AuthContextValue = {
  accessToken: 'token',
  claims: { user_id: 1, role: 'STAFF' as const, name: 'Staff User' },
  currentUser: {
    id: 1,
    username: 'staff-user',
    email: 'staff@example.com',
    first_name: 'أحمد',
    last_name: 'علي',
    phone_number: null,
    is_active: true,
    profile_role: 'STAFF' as const,
    account_created_by: null,
  },
  accessibleClubs,
  accessibleCourts: [],
  selectedClubSlug: null,
  selectedCourtId: null,
  role: 'STAFF' as const,
  isAuthenticated: true,
  isLoadingSession: false,
  isTokenExpired: false,
  sessionError: null,
  login: vi.fn(),
  logout: vi.fn(),
  selectClub,
  selectCourt: vi.fn(),
  clearSelectedClub: vi.fn(),
  refreshCurrentUser: vi.fn(),
  setTokens: vi.fn(),
}

function renderClubSelectionPage() {
  render(
    <MemoryRouter initialEntries={['/select-club']}>
      <Routes>
        <Route element={<ClubSelectionPage />} path="/select-club" />
        <Route element={<p>لوحة التحكم</p>} path="/schedule" />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ClubSelectionPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedUseAuth.mockReturnValue(authValue)
  })

  it('renders multiple accessible club cards', () => {
    renderClubSelectionPage()

    expect(screen.getByRole('heading', { name: 'اختيار النادي' }))
      .toBeInTheDocument()
    expect(screen.getByText('Demo Football Club')).toBeInTheDocument()
    expect(screen.getByText('Second Club')).toBeInTheDocument()
    expect(screen.getByText('demo-football-club')).toBeInTheDocument()
    expect(screen.getByText('second-club')).toBeInTheDocument()
  })

  it('stores the selected club slug and redirects to schedule', async () => {
    const user = userEvent.setup()

    renderClubSelectionPage()

    await user.click(
      screen.getAllByRole('button', { name: 'الدخول إلى النادي' })[1],
    )

    expect(selectClub).toHaveBeenCalledWith('second-club')
    expect(await screen.findByText('لوحة التحكم')).toBeInTheDocument()
  })
})
