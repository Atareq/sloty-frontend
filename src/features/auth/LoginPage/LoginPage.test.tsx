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
import { createDevAccessToken } from '../../../core/auth/devAuth'
import { LoginPage } from './LoginPage'

vi.mock('../../../core/auth/authApi', () => ({
  fetchCurrentUserProfile: vi.fn(),
  loginWithPassword: vi.fn(),
}))

const mockedFetchCurrentUserProfile = vi.mocked(fetchCurrentUserProfile)
const mockedLoginWithPassword = vi.mocked(loginWithPassword)
const currentUserProfile = {
  id: 1,
  username: 'staff-user',
  email: 'staff@example.com',
  first_name: 'أحمد',
  last_name: 'علي',
  phone_number: null,
  is_active: true,
  is_platform_admin: false,
  requires_club_selection: false,
  memberships: [
    {
      id: 10,
      role: 'STAFF' as const,
      club: {
        id: 1,
        slug: 'demo-football-club',
        name: 'Demo Football Club',
        is_active: true,
      },
      court: { id: 3, name: 'Court 1' },
    },
  ],
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
          <Route element={<p>لوحة التحكم</p>} path="/dashboard" />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    clearAuthTokens()
    vi.clearAllMocks()
    mockedFetchCurrentUserProfile.mockResolvedValue(currentUserProfile)
  })

  it('renders the Arabic login heading', () => {
    renderLoginPage()

    expect(screen.getByRole('heading', { name: 'تسجيل الدخول' }))
      .toBeInTheDocument()
  })

  it('renders the Sloty brand block and login fields', () => {
    renderLoginPage()

    expect(screen.getByText('سلوتي')).toBeInTheDocument()
    expect(screen.getByLabelText('رقم الموبايل أو اسم المستخدم'))
      .toBeInTheDocument()
    expect(screen.getByLabelText('كلمة المرور')).toBeInTheDocument()
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

  it('calls the auth API and stores tokens on successful login', async () => {
    const user = userEvent.setup()
    const accessToken = createDevAccessToken('STAFF')

    mockedLoginWithPassword.mockResolvedValueOnce({
      access: accessToken,
      refresh: 'refresh-token',
    })

    renderLoginPageWithRoutes()

    await user.type(
      screen.getByLabelText('رقم الموبايل أو اسم المستخدم'),
      'staff-user',
    )
    await user.type(screen.getByLabelText('كلمة المرور'), 'secret-pass')
    await user.click(screen.getByRole('button', { name: 'تسجيل الدخول' }))

    expect(mockedLoginWithPassword).toHaveBeenCalledWith({
      username: 'staff-user',
      password: 'secret-pass',
    })
    expect(await screen.findByText('لوحة التحكم')).toBeInTheDocument()
    expect(getAccessToken()).toBe(accessToken)
    expect(getRefreshToken()).toBe('refresh-token')
  })

  it('shows an Arabic error when the auth API rejects login', async () => {
    const user = userEvent.setup()

    mockedLoginWithPassword.mockRejectedValueOnce(new Error('Unauthorized'))

    renderLoginPageWithRoutes()

    await user.type(
      screen.getByLabelText('رقم الموبايل أو اسم المستخدم'),
      'wrong-user',
    )
    await user.type(screen.getByLabelText('كلمة المرور'), 'bad-pass')
    await user.click(screen.getByRole('button', { name: 'تسجيل الدخول' }))

    expect(
      await screen.findByText('تعذر تسجيل الدخول. تأكد من البيانات وحاول مرة أخرى'),
    ).toBeInTheDocument()
    expect(screen.queryByText('لوحة التحكم')).not.toBeInTheDocument()
    expect(getAccessToken()).toBeNull()
  })

  it('shows backend login message and field errors when available', async () => {
    const user = userEvent.setup()

    mockedLoginWithPassword.mockRejectedValueOnce(
      new ApiClientError('بيانات الدخول غير صحيحة', 400, {
        code: 'VALIDATION_ERROR',
        fieldErrors: {
          username: [
            {
              code: 'INVALID_USERNAME',
              message: 'اسم المستخدم غير صحيح',
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

    await user.type(
      screen.getByLabelText('رقم الموبايل أو اسم المستخدم'),
      'wrong-user',
    )
    await user.type(screen.getByLabelText('كلمة المرور'), 'bad-pass')
    await user.click(screen.getByRole('button', { name: 'تسجيل الدخول' }))

    expect(await screen.findByText('بيانات الدخول غير صحيحة'))
      .toBeInTheDocument()
    expect(screen.getByText('اسم المستخدم غير صحيح')).toBeInTheDocument()
    expect(screen.getByText('كلمة المرور غير صحيحة')).toBeInTheDocument()
    expect(getAccessToken()).toBeNull()
  })
})
