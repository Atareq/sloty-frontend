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
  const { isAuthenticated, isLoadingSession, role } = useAuth()

  if (isLoadingSession) {
    return <p className="p-4 text-sm font-semibold">جاري تحميل الجلسة...</p>
  }

  if (!isAuthenticated || !role) {
    return <Navigate replace to="/login" />
  }

  return <Navigate replace to={getDefaultRouteForRole(role)} />
}
