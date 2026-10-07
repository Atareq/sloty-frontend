import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiClientError } from '../../../core/api/apiClient'
import { AuthProvider } from '../../../core/auth/AuthProvider'
import { AuthLandingRedirect } from '../../../core/auth/AuthLandingRedirect'
import {
  fetchCurrentUserProfile,
  loginWithPassword,
} from '../../../core/auth/authApi'
import {
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
} from '../../../core/auth/authStorage'
import { ProtectedRoute } from '../../../core/auth/ProtectedRoute'
import { clearSelectedClubSlug } from '../../../core/auth/selectedClubStorage'
import { clearSelectedCourtId } from '../../../core/auth/selectedCourtStorage'
import { createDevAccessToken } from '../../../core/auth/devAuth'
import type { CurrentUserProfile } from '../../../core/auth/auth.types'
import { HomeRoute } from '../../../app/HomeRoute'
import { getClub, listClubs } from '../../../features/clubs/clubsApi'
import { listCourts } from '../../../features/courts/courtsApi'
import { LoginPage } from './LoginPage'

vi.mock('../../../core/auth/authApi', () => ({
  fetchCurrentUserProfile: vi.fn(),
  loginWithPassword: vi.fn(),
}))

vi.mock('../../../core/auth/authStorage', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../../core/auth/authStorage')>()

  return {
    ...actual,
    setAccessToken: vi.fn(actual.setAccessToken),
    setRefreshToken: vi.fn(actual.setRefreshToken),
  }
})

vi.mock('../../../features/clubs/clubsApi', () => ({
  getClub: vi.fn(),
  listClubs: vi.fn(),
}))

vi.mock('../../../features/courts/courtsApi', () => ({
  listCourts: vi.fn(),
}))

vi.mock('../../../features/publicDiscovery/publicDiscoveryApi', () => ({
  listPublicCourts: vi.fn(async () => ({
    courts: [],
    totalCount: 0,
    hasNextPage: false,
  })),
}))

const mockedFetchCurrentUserProfile = vi.mocked(fetchCurrentUserProfile)
const mockedLoginWithPassword = vi.mocked(loginWithPassword)
const mockedSetAccessToken = vi.mocked(setAccessToken)
const mockedSetRefreshToken = vi.mocked(setRefreshToken)
const mockedGetClub = vi.mocked(getClub)
const mockedListClubs = vi.mocked(listClubs)
const mockedListCourts = vi.mocked(listCourts)

const currentUserProfile: CurrentUserProfile = {
  id: 1,
  email: 'staff@example.com',
  first_name: 'أحمد',
  last_name: 'علي',
  phone_number: '+201011122233',
  is_active: true,
  profile_role: 'STAFF',
  account_created_by: { id: 2, name: 'مالك النادي' },
}

function renderLoginPage() {
  render(
    <AuthProvider>
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </AuthProvider>,
  )
}

function renderLoginPageWithRoutes() {
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route element={<AuthLandingRedirect />} path="/" />
          <Route element={<LoginPage />} path="/login" />
          <Route element={<p>لوحة التحكم</p>} path="/schedule" />
          <Route element={<p>المتابعة</p>} path="/dashboard" />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
}

type LoginEntry = Parameters<typeof MemoryRouter>[0]['initialEntries']

/**
 * Renders Login next to the real `/` element (`HomeRoute` → `PublicHomePage`),
 * a placeholder Public Schedule, and a protected workspace route.
 */
function renderLoginWithPublicHome(initialEntries: LoginEntry) {
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route element={<HomeRoute />} path="/" />
          <Route element={<LoginPage />} path="/login" />
          <Route
            element={<p>الجدول العام للملعب</p>}
            path="/public/:clubSlug/courts/:courtId/schedule"
          />
          <Route
            element={
              <ProtectedRoute>
                <p>لوحة التحكم</p>
              </ProtectedRoute>
            }
            path="/schedule"
          />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
}

function expectGuestBlockVisible() {
  expect(screen.getByText('مش من فريق العمل في الملعب؟')).toBeInTheDocument()
  expect(
    screen.getByText('تقدر تدخل كزائر وتشوف المواعيد المتاحة فقط.'),
  ).toBeInTheDocument()
  expect(
    screen.getByRole('button', { name: 'المتابعة كزائر' }),
  ).toBeInTheDocument()
}

async function expectPublicCourtsHome() {
  expect(
    await screen.findByRole('heading', {
      level: 1,
      name: 'سلوتي لحجز ملاعب كرة القدم',
    }),
  ).toBeInTheDocument()
  expect(
    screen.getByRole('heading', { level: 2, name: 'ملاعب كرة القدم' }),
  ).toBeInTheDocument()
  expect(
    screen.queryByRole('heading', { name: 'تسجيل الدخول' }),
  ).not.toBeInTheDocument()
}

function expectNoAuthenticationCreated() {
  expect(mockedLoginWithPassword).not.toHaveBeenCalled()
  expect(mockedFetchCurrentUserProfile).not.toHaveBeenCalled()
  expect(mockedSetAccessToken).not.toHaveBeenCalled()
  expect(mockedSetRefreshToken).not.toHaveBeenCalled()
  expect(getAccessToken()).toBeNull()
  expect(getRefreshToken()).toBeNull()
}

describe('LoginPage', () => {
  beforeEach(() => {
    clearAuthTokens()
    clearSelectedClubSlug()
    clearSelectedCourtId()
    vi.clearAllMocks()
    mockedFetchCurrentUserProfile.mockResolvedValue(currentUserProfile)
    mockedGetClub.mockResolvedValue({
      id: 1,
      name: 'نادي النصر',
      slug: 'nasr-club',
      city: 'ASSIUT',
      is_active: true,
      created: '2026-08-01T00:00:00Z',
    })
    mockedListClubs.mockResolvedValue({
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          id: 1,
          name: 'نادي النصر',
          slug: 'nasr-club',
          city: 'ASSIUT',
          is_active: true,
          created: '2026-08-01T00:00:00Z',
        },
      ],
    })
    mockedListCourts.mockResolvedValue({
      count: 0,
      next: null,
      previous: null,
      results: [],
    })
  })

  it('renders the Arabic login heading', () => {
    renderLoginPage()

    expect(
      screen.getByRole('heading', { name: 'تسجيل الدخول' }),
    ).toBeInTheDocument()
  })

  it('renders the Sloty brand block, login fields, primary login action, and the approved guest block on direct /login', () => {
    renderLoginPage()

    expect(screen.getByText('سلوتي')).toBeInTheDocument()
    expect(screen.getByLabelText('رقم الموبايل')).toBeInTheDocument()
    expect(screen.getByLabelText('كلمة المرور')).toBeInTheDocument()

    const loginButton = screen.getByRole('button', { name: 'تسجيل الدخول' })

    expect(loginButton).toBeInTheDocument()
    expect(loginButton).toHaveAttribute('type', 'submit')

    expectGuestBlockVisible()

    const guestButton = screen.getByRole('button', { name: 'المتابعة كزائر' })
    expect(guestButton).toHaveAttribute('type', 'button')
    expect(guestButton).toHaveClass('min-h-11', 'w-full')
    expect(
      screen.queryByRole('button', { name: 'الدخول كضيف' }),
    ).not.toBeInTheDocument()
  })

  // Test 1 — payload: sends phone_number and password, NO username or email
  it('sends phone_number and password in the login payload without username or email', async () => {
    const user = userEvent.setup()
    const accessToken = createDevAccessToken('STAFF')

    mockedLoginWithPassword.mockResolvedValueOnce({
      access: accessToken,
      refresh: 'refresh-token',
    })

    renderLoginPageWithRoutes()

    await user.type(screen.getByLabelText('رقم الموبايل'), '01011122233')
    await user.type(screen.getByLabelText('كلمة المرور'), 'secret')
    await user.click(screen.getByRole('button', { name: 'تسجيل الدخول' }))

    expect(mockedLoginWithPassword).toHaveBeenCalledTimes(1)
    const payload = mockedLoginWithPassword.mock.calls[0][0]
    expect(payload).toEqual({
      phone_number: '+201011122233',
      password: 'secret',
    })
    expect(payload).not.toHaveProperty('username')
    expect(payload).not.toHaveProperty('email')
    expect(await screen.findByText('لوحة التحكم')).toBeInTheDocument()
  })

  // Test 2 — required phone: empty phone triggers required validation
  it('shows required phone validation when phone number is empty', async () => {
    const user = userEvent.setup()

    renderLoginPage()

    await user.type(screen.getByLabelText('كلمة المرور'), 'secret-pass')
    await user.click(screen.getByRole('button', { name: 'تسجيل الدخول' }))

    expect(await screen.findByText('رقم الموبايل مطلوب')).toBeInTheDocument()
    expect(mockedLoginWithPassword).not.toHaveBeenCalled()
  })

  // Test 3 — invalid phone: invalid phone triggers shared invalid-phone validation
  it('shows invalid phone validation when phone number is invalid', async () => {
    const user = userEvent.setup()

    renderLoginPage()

    await user.type(screen.getByLabelText('رقم الموبايل'), '12345')
    await user.type(screen.getByLabelText('كلمة المرور'), 'secret-pass')
    await user.click(screen.getByRole('button', { name: 'تسجيل الدخول' }))

    expect(await screen.findByText('رقم الموبايل غير صحيح')).toBeInTheDocument()
    expect(mockedLoginWithPassword).not.toHaveBeenCalled()
  })

  // Test 4 — success: stores access and refresh tokens and continues session flow
  it('stores access and refresh tokens on successful login and redirects', async () => {
    const user = userEvent.setup()
    const accessToken = createDevAccessToken('STAFF')

    mockedLoginWithPassword.mockResolvedValueOnce({
      access: accessToken,
      refresh: 'REFRESH_TOKEN',
    })

    renderLoginPageWithRoutes()

    await user.type(screen.getByLabelText('رقم الموبايل'), '01012345678')
    await user.type(screen.getByLabelText('كلمة المرور'), 'secret-pass')
    await user.click(screen.getByRole('button', { name: 'تسجيل الدخول' }))

    expect(await screen.findByText('لوحة التحكم')).toBeInTheDocument()
    expect(mockedSetAccessToken).toHaveBeenCalledWith(accessToken)
    expect(mockedSetRefreshToken).toHaveBeenCalledWith('REFRESH_TOKEN')
    expect(getAccessToken()).toBe(accessToken)
    expect(getRefreshToken()).toBe('REFRESH_TOKEN')
  })

  // Test 5 — generic auth failure: 401 returns generic error without account enumeration
  it('shows a generic login error on 401 without account enumeration', async () => {
    const user = userEvent.setup()

    mockedLoginWithPassword.mockRejectedValueOnce(
      new ApiClientError('Unauthorized', 401),
    )

    renderLoginPageWithRoutes()

    await user.type(screen.getByLabelText('رقم الموبايل'), '01012345678')
    await user.type(screen.getByLabelText('كلمة المرور'), 'wrong-pass')
    await user.click(screen.getByRole('button', { name: 'تسجيل الدخول' }))

    expect(
      await screen.findByText(
        'تعذر تسجيل الدخول. تأكد من البيانات وحاول مرة أخرى',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText('لوحة التحكم')).not.toBeInTheDocument()
    expect(getAccessToken()).toBeNull()
  })

  // Test 6 — no username dependency in auth code / UI
  it('does not render username input, labels, or username autocomplete', () => {
    renderLoginPage()

    expect(screen.queryByLabelText('إسم المستخدم')).not.toBeInTheDocument()
    expect(screen.queryByPlaceholderText('اسم المستخدم')).not.toBeInTheDocument()
    expect(screen.queryByText('اسم المستخدم')).not.toBeInTheDocument()
    expect(
      document.querySelector('input[autocomplete="username"]'),
    ).not.toBeInTheDocument()
  })

  // Test 7 — /me does not require username
  it('hydrates user session successfully when /me response does not contain username', async () => {
    const user = userEvent.setup()
    const accessToken = createDevAccessToken('STAFF')

    // /me response without username field
    const profileWithoutUsername: CurrentUserProfile = {
      id: 10,
      email: 'user@example.com',
      first_name: 'طارق',
      last_name: 'أحمد',
      phone_number: '+201099887766',
      is_active: true,
      profile_role: 'STAFF',
      account_created_by: null,
    }
    mockedFetchCurrentUserProfile.mockResolvedValueOnce(profileWithoutUsername)
    mockedLoginWithPassword.mockResolvedValueOnce({
      access: accessToken,
      refresh: 'refresh-token',
    })

    renderLoginPageWithRoutes()

    await user.type(screen.getByLabelText('رقم الموبايل'), '01099887766')
    await user.type(screen.getByLabelText('كلمة المرور'), 'secret-pass')
    await user.click(screen.getByRole('button', { name: 'تسجيل الدخول' }))

    expect(await screen.findByText('لوحة التحكم')).toBeInTheDocument()
    expect(getAccessToken()).toBe(accessToken)
  })

  it('keeps password manager autocomplete on the password field', () => {
    renderLoginPage()

    expect(screen.getByLabelText('كلمة المرور')).toHaveAttribute(
      'autocomplete',
      'current-password',
    )
  })

  it('toggles password visibility locally', async () => {
    const user = userEvent.setup()

    renderLoginPage()

    const passwordInput = screen.getByLabelText('كلمة المرور')

    expect(passwordInput).toHaveAttribute('type', 'password')

    await user.click(screen.getByRole('button', { name: 'إظهار كلمة المرور' }))

    expect(passwordInput).toHaveAttribute('type', 'text')
    expect(
      screen.getByRole('button', { name: 'إخفاء كلمة المرور' }),
    ).toBeInTheDocument()
  })

  it('shows backend login message and field errors when available', async () => {
    const user = userEvent.setup()

    mockedLoginWithPassword.mockRejectedValueOnce(
      new ApiClientError('بيانات الدخول غير صحيحة', 400, {
        code: 'VALIDATION_ERROR',
        fieldErrors: {
          phone_number: [
            {
              code: 'INVALID_PHONE',
              message: 'رقم الموبايل غير مسجل',
            },
          ],
          password: [
            {
              code: 'INVALID_PASSWORD',
              message: 'كلمة المرور غير صحيحة',
            },
          ],
        },
      }),
    )

    renderLoginPageWithRoutes()

    await user.type(screen.getByLabelText('رقم الموبايل'), '01012345678')
    await user.type(screen.getByLabelText('كلمة المرور'), 'bad-pass')
    await user.click(screen.getByRole('button', { name: 'تسجيل الدخول' }))

    expect(await screen.findByText('بيانات الدخول غير صحيحة')).toBeInTheDocument()
    expect(screen.getByText('رقم الموبايل غير مسجل')).toBeInTheDocument()
    expect(screen.getByText('كلمة المرور غير صحيحة')).toBeInTheDocument()
    expect(getAccessToken()).toBeNull()
  })

  it('opens the existing Public Courts Home (/) from direct /login when المتابعة كزائر is clicked, without creating authentication', async () => {
    const user = userEvent.setup()

    renderLoginWithPublicHome(['/login'])

    expectGuestBlockVisible()
    await user.click(screen.getByRole('button', { name: 'المتابعة كزائر' }))

    await expectPublicCourtsHome()
    expectNoAuthenticationCreated()
  })

  it('keeps the guest block when Login is opened from a Public Schedule and goes to Public Home, not back to the Schedule', async () => {
    const user = userEvent.setup()

    renderLoginWithPublicHome([
      {
        pathname: '/login',
        state: { guestReturnTo: '/public/al-ahly/courts/5/schedule' },
      },
    ])

    expectGuestBlockVisible()
    await user.click(screen.getByRole('button', { name: 'المتابعة كزائر' }))

    await expectPublicCourtsHome()
    expect(screen.queryByText('الجدول العام للملعب')).not.toBeInTheDocument()
    expectNoAuthenticationCreated()
  })

  it('keeps the guest block after a protected-route redirect and goes to Public Home', async () => {
    const user = userEvent.setup()

    renderLoginWithPublicHome(['/schedule'])

    expect(
      await screen.findByRole('heading', { name: 'تسجيل الدخول' }),
    ).toBeInTheDocument()
    expectGuestBlockVisible()
    await user.click(screen.getByRole('button', { name: 'المتابعة كزائر' }))

    await expectPublicCourtsHome()
    expect(screen.queryByText('لوحة التحكم')).not.toBeInTheDocument()
    expectNoAuthenticationCreated()
  })

  it.each([
    ['an external URL', { guestReturnTo: 'https://evil.com' }],
    ['a private route', { guestReturnTo: '/dashboard' }],
    ['a non-string value', { guestReturnTo: 42 }],
    ['an arbitrary previous location', { from: { pathname: '/settlements' } }],
  ])(
    'ignores %s in Login state and still goes to Public Home',
    async (_label, state) => {
      const user = userEvent.setup()

      renderLoginWithPublicHome([{ pathname: '/login', state }])

      expectGuestBlockVisible()
      await user.click(screen.getByRole('button', { name: 'المتابعة كزائر' }))

      await expectPublicCourtsHome()
      expectNoAuthenticationCreated()
    },
  )

  it('navigates to the default authenticated home route (/) on successful login even if guestReturnTo is present', async () => {
    const user = userEvent.setup()
    const accessToken = createDevAccessToken('STAFF')

    mockedLoginWithPassword.mockResolvedValueOnce({
      access: accessToken,
      refresh: 'refresh-token',
    })

    render(
      <AuthProvider>
        <MemoryRouter
          initialEntries={[
            {
              pathname: '/login',
              state: { guestReturnTo: '/public/al-ahly/courts/5/schedule' },
            },
          ]}
        >
          <Routes>
            <Route element={<AuthLandingRedirect />} path="/" />
            <Route element={<LoginPage />} path="/login" />
            <Route element={<p>لوحة التحكم</p>} path="/schedule" />
            <Route
              element={<p>الجدول العام للملعب</p>}
              path="/public/:clubSlug/courts/:courtId/schedule"
            />
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    )

    await user.type(screen.getByLabelText('رقم الموبايل'), '01012345678')
    await user.type(screen.getByLabelText('كلمة المرور'), 'secret-pass')
    await user.click(screen.getByRole('button', { name: 'تسجيل الدخول' }))

    expect(await screen.findByText('لوحة التحكم')).toBeInTheDocument()
    expect(screen.queryByText('الجدول العام للملعب')).not.toBeInTheDocument()
  })
})
