import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router'
import { AuthProvider } from './AuthProvider'
import { fetchCurrentUserProfile } from './authApi'
import { clearAuthTokens, setAccessToken } from './authStorage'
import type { CurrentUserProfile } from './auth.types'
import { createDevAccessToken } from './devAuth'
import { RoleRoute } from './RoleRoute'

vi.mock('./authApi', () => ({
  fetchCurrentUserProfile: vi.fn(),
}))

const mockedFetchCurrentUserProfile = vi.mocked(fetchCurrentUserProfile)

const currentUserProfile: CurrentUserProfile = {
  id: 1,
  username: 'staff-user',
  email: 'staff@example.com',
  first_name: 'أحمد',
  last_name: 'علي',
  phone_number: null,
  is_active: true,
  profile_role: 'STAFF',
  account_created_by: null,
}

const adminProfile: CurrentUserProfile = {
  ...currentUserProfile,
  id: 2,
  username: 'admin-user',
  profile_role: 'ADMIN',
}

function renderRoleRoute() {
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/admin-only']}>
        <Routes>
          <Route element={<p>صفحة تسجيل الدخول</p>} path="/login" />
          <Route element={<p>لوحة التحكم</p>} path="/schedule" />
          <Route
            element={
              <RoleRoute allowedRoles={['ADMIN']}>
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
    setAccessToken(createDevAccessToken('STAFF'))
    mockedFetchCurrentUserProfile.mockResolvedValueOnce(currentUserProfile)

    renderRoleRoute()

    expect(await screen.findByText('لوحة التحكم')).toBeInTheDocument()
  })

  it('allows authorized roles', async () => {
    setAccessToken(createDevAccessToken('ADMIN'))
    mockedFetchCurrentUserProfile.mockResolvedValueOnce(adminProfile)

    renderRoleRoute()

    expect(await screen.findByText('إدارة المنصة')).toBeInTheDocument()
  })
})
