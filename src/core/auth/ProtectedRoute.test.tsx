import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router'
import { AuthProvider } from './AuthProvider'
import { fetchCurrentUserProfile } from './authApi'
import { ApiClientError } from '../api/apiClient'
import { clearAuthTokens, getAccessToken, setAccessToken } from './authStorage'
import { createDevAccessToken } from './devAuth'
import { ProtectedRoute } from './ProtectedRoute'

vi.mock('./authApi', () => ({
  fetchCurrentUserProfile: vi.fn(),
}))

const mockedFetchCurrentUserProfile = vi.mocked(fetchCurrentUserProfile)

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

function renderProtectedRoute() {
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/private']}>
        <Routes>
          <Route element={<p>صفحة تسجيل الدخول</p>} path="/login" />
          <Route
            element={
              <ProtectedRoute>
                <p>محتوى محمي</p>
              </ProtectedRoute>
            }
            path="/private"
          />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    clearAuthTokens()
    vi.clearAllMocks()
  })

  it('redirects unauthenticated users to login', () => {
    renderProtectedRoute()

    expect(screen.getByText('صفحة تسجيل الدخول')).toBeInTheDocument()
  })

  it('shows a loading state while session hydration is running', () => {
    setAccessToken(createDevAccessToken('court_staff'))
    mockedFetchCurrentUserProfile.mockReturnValueOnce(new Promise(() => {}))

    renderProtectedRoute()

    expect(screen.getByText('جاري تحميل الجلسة...')).toBeInTheDocument()
  })

  it('renders protected content for authenticated users', async () => {
    setAccessToken(createDevAccessToken('court_staff'))
    mockedFetchCurrentUserProfile.mockResolvedValueOnce(currentUserProfile)

    renderProtectedRoute()

    expect(await screen.findByText('محتوى محمي')).toBeInTheDocument()
  })

  it.each([401, 403])(
    'clears tokens and redirects when session hydration returns %s',
    async (status) => {
      setAccessToken(createDevAccessToken('court_staff'))
      mockedFetchCurrentUserProfile.mockRejectedValueOnce(
        new ApiClientError('Unauthorized', status),
      )

      renderProtectedRoute()

      expect(await screen.findByText('صفحة تسجيل الدخول')).toBeInTheDocument()
      expect(screen.queryByText('جاري تحميل الجلسة...')).not.toBeInTheDocument()
      expect(getAccessToken()).toBeNull()
    },
  )
})
