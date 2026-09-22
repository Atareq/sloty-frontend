import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthContextValue } from './auth.types'
import { AuthLandingRedirect } from './AuthLandingRedirect'
import { useAuth } from './useAuth'

vi.mock('./useAuth', () => ({
  useAuth: vi.fn(),
}))

const mockedUseAuth = vi.mocked(useAuth)
const refreshCurrentUser = vi.fn().mockResolvedValue(undefined)
const logout = vi.fn().mockResolvedValue(undefined)

const baseAuth: AuthContextValue = {
  accessToken: 'token',
  claims: { user_id: 1 },
  currentUser: null,
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
  refreshCurrentUser,
  setTokens: vi.fn(),
}

function renderLanding() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route element={<AuthLandingRedirect />} path="/" />
        <Route element={<p>صفحة تسجيل الدخول</p>} path="/login" />
        <Route element={<p>الجدول</p>} path="/schedule" />
      </Routes>
    </MemoryRouter>,
  )
}

describe('AuthLandingRedirect', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedUseAuth.mockReturnValue(baseAuth)
  })

  it('shows a real session error with retry and logout instead of fake loading', async () => {
    const user = userEvent.setup()
    mockedUseAuth.mockReturnValue({
      ...baseAuth,
      sessionError: 'تعذر تحميل بيانات الحساب',
    })

    renderLanding()

    expect(screen.getByText('تعذر تحميل بيانات الحساب')).toBeInTheDocument()
    expect(screen.queryByText('جاري تحميل الجلسة...')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'إعادة المحاولة' }))
    expect(refreshCurrentUser).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: 'تسجيل الخروج' }))
    expect(logout).toHaveBeenCalledTimes(1)
  })

  it('shows loading copy only while session hydration is running', () => {
    mockedUseAuth.mockReturnValue({
      ...baseAuth,
      isLoadingSession: true,
    })

    renderLanding()

    expect(screen.getByText('جاري تحميل الجلسة...')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'إعادة المحاولة' }),
    ).not.toBeInTheDocument()
  })
})
