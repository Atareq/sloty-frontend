import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router'
import { AuthProvider } from './AuthProvider'
import { fetchCurrentUserProfile } from './authApi'
import { clearAuthTokens, setAccessToken } from './authStorage'
import { createDevAccessToken } from './devAuth'
import { RoleRoute } from './RoleRoute'

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

function renderRoleRoute() {
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/admin-only']}>
        <Routes>
          <Route element={<p>صفحة تسجيل الدخول</p>} path="/login" />
          <Route element={<p>جدول الموظف</p>} path="/schedule" />
          <Route
            element={
              <RoleRoute allowedRoles={['platform_super_admin']}>
                <p>إدارة المنصة</p>
              </RoleRoute>
            }
            path="/admin-only"
          />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
}

describe('RoleRoute', () => {
  beforeEach(() => {
    clearAuthTokens()
    vi.clearAllMocks()
  })

  it('blocks unauthorized authenticated roles', async () => {
    setAccessToken(createDevAccessToken('court_staff'))
    mockedFetchCurrentUserProfile.mockResolvedValueOnce(currentUserProfile)

    renderRoleRoute()

    expect(await screen.findByText('جدول الموظف')).toBeInTheDocument()
  })

  it('allows authorized roles', async () => {
    setAccessToken(createDevAccessToken('platform_super_admin'))
    mockedFetchCurrentUserProfile.mockResolvedValueOnce(currentUserProfile)

    renderRoleRoute()

    expect(await screen.findByText('إدارة المنصة')).toBeInTheDocument()
  })
})
