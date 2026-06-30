import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router'
import { AuthProvider } from './AuthProvider'
import { clearAuthTokens, setAccessToken } from './authStorage'
import { createDevAccessToken } from './devAuth'
import { ProtectedRoute } from './ProtectedRoute'

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
  })

  it('redirects unauthenticated users to login', () => {
    renderProtectedRoute()

    expect(screen.getByText('صفحة تسجيل الدخول')).toBeInTheDocument()
  })

  it('renders protected content for authenticated users', () => {
    setAccessToken(createDevAccessToken('court_staff'))

    renderProtectedRoute()

    expect(screen.getByText('محتوى محمي')).toBeInTheDocument()
  })
})
