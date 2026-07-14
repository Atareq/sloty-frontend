import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../../../core/auth/AuthProvider'
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
  memberships: 'read-only backend shape',
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
          <Route element={<LoginPage />} path="/login" />
          <Route element={<p>صفحة الجدول</p>} path="/schedule" />
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
    expect(screen.getByLabelText(/كود النادي/)).toBeInTheDocument()
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
    await user.type(screen.getByLabelText(/كود النادي/), 'nasr-club')
    await user.click(screen.getByRole('button', { name: 'تسجيل الدخول' }))

    expect(mockedLoginWithPassword).toHaveBeenCalledWith({
      username: 'staff-user',
      password: 'secret-pass',
      club_slug: 'nasr-club',
    })
    expect(await screen.findByText('صفحة الجدول')).toBeInTheDocument()
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
    expect(screen.queryByText('صفحة الجدول')).not.toBeInTheDocument()
    expect(getAccessToken()).toBeNull()
  })
})
