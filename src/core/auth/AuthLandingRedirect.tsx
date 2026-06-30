import { Navigate } from 'react-router'
import { getDefaultRouteForRole } from './auth.types'
import { useAuth } from './useAuth'

/**
 * Sends visitors at `/` to the correct first screen for their auth state.
 *
 * This keeps default redirects centralized instead of scattering role checks
 * through individual pages.
 */
export function AuthLandingRedirect() {
  const { isAuthenticated, role } = useAuth()

  if (!isAuthenticated || !role) {
    return <Navigate replace to="/login" />
  }

  return <Navigate replace to={getDefaultRouteForRole(role)} />
}
