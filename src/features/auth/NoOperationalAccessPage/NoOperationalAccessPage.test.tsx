import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router'
import type { AuthContextValue } from '../../../core/auth/auth.types'
import { useAuth } from '../../../core/auth/useAuth'
import { NoOperationalAccessPage } from './NoOperationalAccessPage'

vi.mock('../../../core/auth/useAuth', () => ({
  useAuth: vi.fn(),
}))

const mockedUseAuth = vi.mocked(useAuth)
const logout = vi.fn().mockResolvedValue(undefined)

const nonOperationalAuthValue: AuthContextValue = {
  accessToken: 'token',
  claims: { user_id: 1 },
  currentUser: {
    id: 1,
    username: 'player-user',
    email: 'player@example.com',
    first_name: 'Player',
    last_name: 'Customer',
    phone_number: '+201012345678',
    is_active: true,
    profile_role: 'PLAYER',
    account_created_by: null,
  },
  selectedClubSlug: null,
  accessibleClubs: [],
  accessibleCourts: [],
  selectedCourtId: null,
  selectCourt: vi.fn(),
  role: null,
  isAuthenticated: true,
  isOperational: false,
  isLoadingSession: false,
  isTokenExpired: false,
  sessionError: null,
  login: vi.fn(),
  logout,
  selectClub: vi.fn(),
  clearSelectedClub: vi.fn(),
  refreshCurrentUser: vi.fn(),
  setTokens: vi.fn(),
}

describe('NoOperationalAccessPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedUseAuth.mockReturnValue(nonOperationalAuthValue)
  })

  it('renders the Arabic no-operational-access message and logout button', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <NoOperationalAccessPage />
      </MemoryRouter>,
    )

    expect(
      screen.getByText('لا يوجد لديك صلاحية لاستخدام لوحة الإدارة'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('هذا الحساب غير مسجل كمدير أو مالك أو موظف في أي ملعب.'),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'تسجيل الخروج' }))

    expect(screen.getByRole('dialog', { name: 'تسجيل الخروج؟' })).toBeInTheDocument()
    await user.click(
      screen.getAllByRole('button', { name: 'تسجيل الخروج' }).at(-1)!,
    )

    expect(logout).toHaveBeenCalledTimes(1)
  })

  it('redirects operational users away to /', () => {
    mockedUseAuth.mockReturnValue({
      ...nonOperationalAuthValue,
      role: 'STAFF',
      isOperational: true,
      currentUser: {
        ...nonOperationalAuthValue.currentUser!,
        profile_role: 'STAFF',
      },
    })

    render(
      <MemoryRouter initialEntries={['/no-operational-access']}>
        <Routes>
          <Route element={<p>الصفحة الرئيسية</p>} path="/" />
          <Route
            element={<NoOperationalAccessPage />}
            path="/no-operational-access"
          />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('الصفحة الرئيسية')).toBeInTheDocument()
  })
})

