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
  account_created_by: null,
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

const platformAdminProfile = {
  ...currentUserProfile,
  is_platform_admin: true,
  requires_club_selection: false,
  memberships: [],
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
              <RoleRoute allowedRoles={['PLATFORM_ADMIN']}>
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
    setAccessToken(createDevAccessToken('PLATFORM_ADMIN'))
    mockedFetchCurrentUserProfile.mockResolvedValueOnce(platformAdminProfile)

    renderRoleRoute()

    expect(await screen.findByText('إدارة المنصة')).toBeInTheDocument()
  })
})
