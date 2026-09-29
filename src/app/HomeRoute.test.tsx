import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthContextValue } from '../core/auth/auth.types'
import { useAuth } from '../core/auth/useAuth'
import { isRunningStandalone } from '../pwa/pwaInstall'
import { HomeRoute } from './HomeRoute'

vi.mock('../core/auth/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../pwa/pwaInstall', () => ({
  isRunningStandalone: vi.fn(() => false),
}))

const mockedUseAuth = vi.mocked(useAuth)
const mockedIsRunningStandalone = vi.mocked(isRunningStandalone)

const signedOutAuth: AuthContextValue = {
  accessToken: null,
  claims: null,
  currentUser: null,
  selectedClubSlug: null,
  accessibleClubs: [],
  accessibleCourts: [],
  selectedCourtId: null,
  selectCourt: vi.fn(),
  role: null,
  isAuthenticated: false,
  isOperational: false,
  isLoadingSession: false,
  isTokenExpired: false,
  sessionError: null,
  login: vi.fn(),
  logout: vi.fn(),
  selectClub: vi.fn(),
  clearSelectedClub: vi.fn(),
  refreshCurrentUser: vi.fn(),
  setTokens: vi.fn(),
}

function renderHome() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route element={<HomeRoute />} path="/" />
        <Route element={<p>صفحة تسجيل الدخول</p>} path="/login" />
        <Route element={<p>الجدول</p>} path="/schedule" />
      </Routes>
    </MemoryRouter>,
  )
}

describe('HomeRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedIsRunningStandalone.mockReturnValue(false)
    mockedUseAuth.mockReturnValue(signedOutAuth)
  })

  it('shows the public homepage to signed-out visitors and crawlers', () => {
    renderHome()

    expect(
      screen.getByRole('heading', { level: 1, name: 'إدارة وحجز الملاعب بسهولة مع Sloty' }),
    ).toBeInTheDocument()
  })

  it('keeps the installed PWA launch going straight to login when signed out', () => {
    mockedIsRunningStandalone.mockReturnValue(true)

    renderHome()

    expect(screen.getByText('صفحة تسجيل الدخول')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument()
  })

  it('keeps the role-aware workspace redirect for signed-in users', () => {
    mockedUseAuth.mockReturnValue({
      ...signedOutAuth,
      accessToken: 'token',
      isAuthenticated: true,
      isOperational: true,
      role: 'OWNER',
      currentUser: {
        id: 1,
        profile_id: 1,
        username: 'owner',
        email: '',
        first_name: 'Owner',
        last_name: '',
        phone_number: null,
        is_active: true,
        profile_role: 'OWNER',
        account_created_by: null,
      },
      accessibleClubs: [{ slug: 'club' } as AuthContextValue['accessibleClubs'][number]],
    })

    renderHome()

    expect(screen.getByText('الجدول')).toBeInTheDocument()
  })

  it('shows session loading instead of the homepage while hydration runs', () => {
    mockedUseAuth.mockReturnValue({ ...signedOutAuth, isLoadingSession: true })

    renderHome()

    expect(screen.getByText('جاري تحميل الجلسة...')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument()
  })

  it('keeps the session error with retry when tokens remain but hydration failed', () => {
    mockedUseAuth.mockReturnValue({
      ...signedOutAuth,
      accessToken: 'token',
      isAuthenticated: true,
      sessionError: 'تعذر تحميل بيانات الحساب',
    })

    renderHome()

    expect(screen.getByText('تعذر تحميل بيانات الحساب')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'إعادة المحاولة' })).toBeInTheDocument()
  })
})
