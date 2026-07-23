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

const authValue = {
  accessToken: 'token',
  claims: { user_id: 1 },
  currentUser: {
    id: 1,
    username: 'staff-user',
    email: 'staff@example.com',
    first_name: 'أحمد',
    last_name: 'علي',
    phone_number: null,
    is_active: true,
    is_platform_admin: false,
    account_created_by: null,
    requires_club_selection: true,
    memberships: [
      {
        id: 10,
        role: 'STAFF' as const,
        club: {
          id: 1,
          slug: 'demo-football-club',
          name: 'Demo Football Club',
          governorate: 'ASSIUT',
          city: 'ASSIUT_MARKAZ',
          address: 'Demo detailed address',
          is_active: true,
        },
        court: { id: 3, name: 'Demo A Court 1' },
      },
      {
        id: 11,
        role: 'MANAGER' as const,
        club: {
          id: 2,
          slug: 'second-club',
          name: 'Second Club',
          governorate: 'ASSIUT',
          city: 'ASSIUT_CITY',
          address: 'Second address',
          is_active: true,
        },
        court: null,
      },
    ],
  },
  selectedClubSlug: null,
  selectedMembership: null,
  role: 'STAFF' as const,
  isAuthenticated: true,
  isLoadingSession: false,
  isTokenExpired: false,
  sessionError: null,
  login: vi.fn(),
  logout: vi.fn(),
  selectClub,
  clearSelectedClub: vi.fn(),
  refreshCurrentUser: vi.fn(),
  setTokens: vi.fn(),
} satisfies AuthContextValue

function renderClubSelectionPage() {
  render(
    <MemoryRouter initialEntries={['/select-club']}>
      <Routes>
        <Route element={<ClubSelectionPage />} path="/select-club" />
        <Route element={<p>لوحة التحكم</p>} path="/dashboard" />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ClubSelectionPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedUseAuth.mockReturnValue(authValue)
  })

  it('renders multiple membership cards with role and court details', () => {
    renderClubSelectionPage()

    expect(screen.getByRole('heading', { name: 'اختيار النادي' }))
      .toBeInTheDocument()
    expect(screen.getByText('Demo Football Club')).toBeInTheDocument()
    expect(screen.getByText('Second Club')).toBeInTheDocument()
    expect(screen.getByText('موظف ملعب')).toBeInTheDocument()
    expect(screen.getByText('Demo A Court 1')).toBeInTheDocument()
    expect(screen.getByText('مدير')).toBeInTheDocument()
  })

  it('stores the selected club slug and redirects to dashboard', async () => {
    const user = userEvent.setup()

    renderClubSelectionPage()

    await user.click(
      screen.getAllByRole('button', { name: 'الدخول إلى النادي' })[1],
    )

    expect(selectClub).toHaveBeenCalledWith('second-club')
    expect(await screen.findByText('لوحة التحكم')).toBeInTheDocument()
  })
})
