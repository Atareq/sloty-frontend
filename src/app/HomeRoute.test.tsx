import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthContextValue } from '../core/auth/auth.types'
import { guestHomeEntryState } from '../core/auth/guestHomeEntry'
import { useAuth } from '../core/auth/useAuth'
import { LoginPage } from '../features/auth/LoginPage/LoginPage'
import { isRunningStandalone } from '../pwa/pwaInstall'
import { HomeRoute } from './HomeRoute'

vi.mock('../core/auth/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../pwa/pwaInstall', () => ({
  isRunningStandalone: vi.fn(() => false),
}))

vi.mock('../features/publicDiscovery/publicDiscoveryApi', () => ({
  listPublicCourts: vi.fn(async () => ({
    courts: [],
    totalCount: 0,
    hasNextPage: false,
  })),
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

function renderHome(
  initialEntries: Parameters<typeof MemoryRouter>[0]['initialEntries'] = ['/'],
) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
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
      screen.getByRole('heading', { level: 1, name: 'سلوتي لحجز ملاعب كرة القدم' }),
    ).toBeInTheDocument()
  })

  it('keeps the installed PWA launch going straight to login when signed out', () => {
    mockedIsRunningStandalone.mockReturnValue(true)

    renderHome()

    expect(screen.getByText('صفحة تسجيل الدخول')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument()
  })

  it('shows the public homepage in the installed PWA after an explicit guest entry from Login', () => {
    mockedIsRunningStandalone.mockReturnValue(true)

    renderHome([{ pathname: '/', state: guestHomeEntryState }])

    expect(
      screen.getByRole('heading', { level: 1, name: 'سلوتي لحجز ملاعب كرة القدم' }),
    ).toBeInTheDocument()
    expect(screen.queryByText('صفحة تسجيل الدخول')).not.toBeInTheDocument()
  })

  it('does not treat unrelated navigation state as a guest entry in the installed PWA', () => {
    mockedIsRunningStandalone.mockReturnValue(true)

    renderHome([{ pathname: '/', state: { guestHomeEntry: 'true' } }])

    expect(screen.getByText('صفحة تسجيل الدخول')).toBeInTheDocument()
  })

  it('takes a signed-out installed-PWA launch to Login, then المتابعة كزائر reaches the public homepage without looping or authenticating', async () => {
    const user = userEvent.setup()
    mockedIsRunningStandalone.mockReturnValue(true)

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<HomeRoute />} path="/" />
          <Route element={<LoginPage />} path="/login" />
        </Routes>
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('heading', { name: 'تسجيل الدخول' }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'المتابعة كزائر' }))

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'سلوتي لحجز ملاعب كرة القدم',
      }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'تسجيل الدخول' }),
    ).not.toBeInTheDocument()
    expect(signedOutAuth.login).not.toHaveBeenCalled()
    expect(signedOutAuth.setTokens).not.toHaveBeenCalled()
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
