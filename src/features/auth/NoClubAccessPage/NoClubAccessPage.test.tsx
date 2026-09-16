import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthContextValue } from '../../../core/auth/auth.types'
import { useAuth } from '../../../core/auth/useAuth'
import { NoClubAccessPage } from './NoClubAccessPage'

vi.mock('../../../core/auth/useAuth', () => ({
  useAuth: vi.fn(),
}))

const mockedUseAuth = vi.mocked(useAuth)
const logout = vi.fn().mockResolvedValue(undefined)

const authValue: AuthContextValue = {
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
    profile_role: null,
    account_created_by: null,
  },
  selectedClubSlug: null,
  accessibleClubs: [],
  accessibleCourts: [],
  selectedCourtId: null,
  selectCourt: vi.fn(),
  role: null,
  isAuthenticated: true,
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

describe('NoClubAccessPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedUseAuth.mockReturnValue(authValue)
  })

  it('renders the Arabic no-access message and logout button', async () => {
    const user = userEvent.setup()

    render(<NoClubAccessPage />)

    expect(screen.getByRole('heading', { name: 'لا توجد صلاحية نادي' }))
      .toBeInTheDocument()
    expect(
      screen.getAllByText('لا يوجد لديك صلاحية للوصول إلى أي نادي حتى الآن.'),
    ).toHaveLength(2)

    await user.click(screen.getByRole('button', { name: 'تسجيل الخروج' }))

    expect(screen.getByRole('dialog', { name: 'تسجيل الخروج؟' }))
      .toBeInTheDocument()
    await user.click(
      screen.getAllByRole('button', { name: 'تسجيل الخروج' }).at(-1)!,
    )

    expect(logout).toHaveBeenCalledTimes(1)
  })
})
