import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from './AuthProvider'
import { fetchCurrentUserProfile } from './authApi'
import { clearAuthTokens, getAccessToken } from './authStorage'
import { createDevAccessToken } from './devAuth'
import { useAuth } from './useAuth'

vi.mock('./authApi', () => ({
  fetchCurrentUserProfile: vi.fn(),
}))

const mockedFetchCurrentUserProfile = vi.mocked(fetchCurrentUserProfile)

function AuthProviderHarness() {
  const { currentUser, login, logout } = useAuth()

  return (
    <div>
      <p>{currentUser?.username ?? 'لا يوجد مستخدم'}</p>
      <button
        onClick={() => login(createDevAccessToken('court_staff'), 'refresh-token')}
        type="button"
      >
        تسجيل دخول تجريبي
      </button>
      <button onClick={logout} type="button">
        خروج
      </button>
    </div>
  )
}

describe('AuthProvider', () => {
  beforeEach(() => {
    clearAuthTokens()
    vi.clearAllMocks()
  })

  it('clears the current user profile on logout', async () => {
    const user = userEvent.setup()

    mockedFetchCurrentUserProfile.mockResolvedValueOnce({
      id: 1,
      username: 'staff-user',
      email: 'staff@example.com',
      first_name: 'أحمد',
      last_name: 'علي',
      phone_number: null,
      is_active: true,
      is_platform_admin: false,
      memberships: 'read-only backend shape',
    })

    render(
      <AuthProvider>
        <AuthProviderHarness />
      </AuthProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'تسجيل دخول تجريبي' }))

    expect(await screen.findByText('staff-user')).toBeInTheDocument()
    expect(getAccessToken()).not.toBeNull()

    await user.click(screen.getByRole('button', { name: 'خروج' }))

    await waitFor(() => expect(getAccessToken()).toBeNull())
    expect(screen.getByText('لا يوجد مستخدم')).toBeInTheDocument()
  })
})
