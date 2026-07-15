import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useAuth } from './useAuth'

export interface ProtectedRouteProps {
  children: ReactNode
  enforceClubAccess?: boolean
}

/**
 * Frontend route guard for authenticated-only screens.
 *
 * This improves route UX only. Backend permission checks remain authoritative.
 */
export function ProtectedRoute({
  children,
  enforceClubAccess = false,
}: ProtectedRouteProps) {
  const location = useLocation()
  const {
    currentUser,
    isAuthenticated,
    isLoadingSession,
    selectedClubSlug,
    sessionError,
  } = useAuth()

  if (isLoadingSession) {
    return <p className="p-4 text-sm font-semibold">جاري تحميل الجلسة...</p>
  }

  if (!isAuthenticated) {
    return <Navigate replace state={{ from: location }} to="/login" />
  }

  if (enforceClubAccess) {
    if (!currentUser) {
      return (
        <p className="p-4 text-sm font-semibold">
          {sessionError ?? 'جاري تحميل الجلسة...'}
        </p>
      )
    }

    if (currentUser.is_platform_admin) {
      return children
    }

    if (currentUser.memberships.length === 0) {
      return <Navigate replace to="/no-club-access" />
    }

    if (currentUser.memberships.length > 1 && !selectedClubSlug) {
      return <Navigate replace to="/select-club" />
    }
  }

  return children
}
