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
} from '../../../core/auth/authStorage'
import { clearSelectedClubSlug } from '../../../core/auth/selectedClubStorage'
import { clearSelectedCourtId } from '../../../core/auth/selectedCourtStorage'
import { createDevAccessToken } from '../../../core/auth/devAuth'
import type { CurrentUserProfile } from '../../../core/auth/auth.types'
import { getClub, listClubs } from '../../../features/clubs/clubsApi'
import { listCourts } from '../../../features/courts/courtsApi'
import { LoginPage } from './LoginPage'

vi.mock('../../../core/auth/authApi', () => ({
  fetchCurrentUserProfile: vi.fn(),
  loginWithPassword: vi.fn(),
}))

vi.mock('../../../features/clubs/clubsApi', () => ({
  getClub: vi.fn(),
  listClubs: vi.fn(),
}))

vi.mock('../../../features/courts/courtsApi', () => ({
  listCourts: vi.fn(),
}))

const mockedFetchCurrentUserProfile = vi.mocked(fetchCurrentUserProfile)
const mockedLoginWithPassword = vi.mocked(loginWithPassword)
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

  it('renders the Sloty brand block and login fields', () => {
    renderLoginPage()

    expect(screen.getByText('سلوتي')).toBeInTheDocument()
    expect(screen.getByLabelText('رقم الموبايل')).toBeInTheDocument()
    expect(screen.getByLabelText('كلمة المرور')).toBeInTheDocument()
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

  it('hides the return as guest button on direct login without guestReturnTo', () => {
    renderLoginPage()

    expect(
      screen.queryByRole('button', { name: 'المتابعة كزائر' }),
    ).not.toBeInTheDocument()
  })

  it('hides the return as guest button when guestReturnTo is invalid or arbitrary', () => {
    render(
      <AuthProvider>
        <MemoryRouter
          initialEntries={[
            {
              pathname: '/login',
              state: { guestReturnTo: '/schedule' },
            },
          ]}
        >
          <LoginPage />
        </MemoryRouter>
      </AuthProvider>,
    )

    expect(
      screen.queryByRole('button', { name: 'المتابعة كزائر' }),
    ).not.toBeInTheDocument()
  })

  it('shows return as guest button and navigates to the public court schedule on click', async () => {
    const user = userEvent.setup()
    const validPublicRoute = '/public/al-ahly/courts/5/schedule'

    render(
      <AuthProvider>
        <MemoryRouter
          initialEntries={[
            {
              pathname: '/login',
              state: { guestReturnTo: validPublicRoute },
            },
          ]}
        >
          <Routes>
            <Route element={<LoginPage />} path="/login" />
            <Route
              element={<p>الجدول العام للملعب</p>}
              path="/public/:clubSlug/courts/:courtId/schedule"
            />
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    )

    expect(screen.getByText('مش من فريق العمل في الملعب؟')).toBeInTheDocument()
    expect(
      screen.getByText('تقدر تدخل كزائر وتشوف المواعيد المتاحة فقط.'),
    ).toBeInTheDocument()

    const returnButton = screen.getByRole('button', { name: 'المتابعة كزائر' })
    expect(returnButton).toBeInTheDocument()

    await user.click(returnButton)

    expect(await screen.findByText('الجدول العام للملعب')).toBeInTheDocument()
  })

  it('does not render guest return copy on ordinary direct visits', () => {
    renderLoginPage()

    expect(
      screen.queryByText('مش من فريق العمل في الملعب؟'),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText('تقدر تدخل كزائر وتشوف المواعيد المتاحة فقط.'),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'المتابعة كزائر' }),
    ).not.toBeInTheDocument()
  })

  it('navigates to the default home route (/) on successful login even if guestReturnTo is present', async () => {
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
