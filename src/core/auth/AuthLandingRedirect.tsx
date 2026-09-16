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
  const {
    accessibleClubs,
    currentUser,
    isAuthenticated,
    isLoadingSession,
    role,
    selectedClubSlug,
  } = useAuth()

  if (isLoadingSession) {
    return <p className="p-4 text-sm font-semibold">جاري تحميل الجلسة...</p>
  }

  if (!isAuthenticated) {
    return <Navigate replace to="/login" />
  }

  if (!currentUser) {
    return <p className="p-4 text-sm font-semibold">جاري تحميل الجلسة...</p>
  }

  if (role === 'ADMIN') {
    return <Navigate replace to="/admin/clubs" />
  }

  if (accessibleClubs.length === 0) {
    return <Navigate replace to="/no-club-access" />
  }

  if (accessibleClubs.length === 1 || selectedClubSlug) {
    return <Navigate replace to="/schedule" />
  }

  if (accessibleClubs.length > 1) {
    return <Navigate replace to="/select-club" />
  }

  if (!role) {
    return <Navigate replace to="/login" />
  }

  return <Navigate replace to={getDefaultRouteForRole(role)} />
}
