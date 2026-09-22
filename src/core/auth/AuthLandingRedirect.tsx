import { Navigate } from 'react-router'
import { AppButton } from '../../shared/components/AppButton/AppButton'
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
    isOperational,
    logout,
    refreshCurrentUser,
    role,
    selectedClubSlug,
    sessionError,
  } = useAuth()

  if (isLoadingSession) {
    return <p className="p-4 text-sm font-semibold">جاري تحميل الجلسة...</p>
  }

  if (!isAuthenticated) {
    return <Navigate replace to="/login" />
  }

  if (!currentUser) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <p className="text-sm font-semibold text-[var(--sloty-danger)]">
          {sessionError ?? 'تعذر تحميل الجلسة.'}
        </p>
        <AppButton onClick={() => void refreshCurrentUser()} type="button">
          إعادة المحاولة
        </AppButton>
        <AppButton
          onClick={() => void logout()}
          type="button"
          variant="secondary"
        >
          تسجيل الخروج
        </AppButton>
      </div>
    )
  }

  if (!isOperational) {
    return <Navigate replace to="/no-operational-access" />
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
    return <Navigate replace to="/no-operational-access" />
  }

  return <Navigate replace to={getDefaultRouteForRole(role)} />
}
