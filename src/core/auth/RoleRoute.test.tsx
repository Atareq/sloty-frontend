import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router'
import { AuthProvider } from './AuthProvider'
import { clearAuthTokens, setAccessToken } from './authStorage'
import { createDevAccessToken } from './devAuth'
import { RoleRoute } from './RoleRoute'

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
  })

  it('blocks unauthorized authenticated roles', () => {
    setAccessToken(createDevAccessToken('court_staff'))

    renderRoleRoute()

    expect(screen.getByText('جدول الموظف')).toBeInTheDocument()
  })

  it('allows authorized roles', () => {
    setAccessToken(createDevAccessToken('platform_super_admin'))

    renderRoleRoute()

    expect(screen.getByText('إدارة المنصة')).toBeInTheDocument()
  })
})
