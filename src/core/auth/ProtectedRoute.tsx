import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { AppButton } from '../../shared/components/AppButton/AppButton'
import { useAuth } from './useAuth'

export interface ProtectedRouteProps {
  children: ReactNode
  enforceClubAccess?: boolean
  allowNonOperational?: boolean
}

function SessionRecoveryPrompt({
  message,
  onLogout,
  onRetry,
}: {
  message: string
  onLogout: () => void
  onRetry: () => void
}) {
  return (
    <div className="flex flex-col gap-3 p-4">
      <p className="text-sm font-semibold text-[var(--sloty-danger)]">
        {message}
      </p>
      <AppButton onClick={onRetry} type="button">
        إعادة المحاولة
      </AppButton>
      <AppButton onClick={onLogout} type="button" variant="secondary">
        تسجيل الخروج
      </AppButton>
    </div>
  )
}

/**
 * Frontend route guard for authenticated-only screens.
 *
 * This improves route UX only. Backend permission checks remain authoritative.
 */
export function ProtectedRoute({
  children,
  enforceClubAccess = false,
  allowNonOperational = false,
}: ProtectedRouteProps) {
  const location = useLocation()
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
    return <Navigate replace state={{ from: location }} to="/login" />
  }

  const recoveryPrompt = (
    <SessionRecoveryPrompt
      message={sessionError ?? 'تعذر تحميل الجلسة.'}
      onLogout={() => void logout()}
      onRetry={() => void refreshCurrentUser()}
    />
  )

  if (!allowNonOperational) {
    if (!currentUser) {
      return recoveryPrompt
    }

    if (!isOperational) {
      return <Navigate replace to="/no-operational-access" />
    }
  }

  if (enforceClubAccess) {
    if (!currentUser) {
      return recoveryPrompt
    }

    if (role === 'ADMIN') {
      return children
    }

    if (accessibleClubs.length === 0) {
      return <Navigate replace to="/no-club-access" />
    }

    if (accessibleClubs.length > 1 && !selectedClubSlug) {
      return <Navigate replace to="/select-club" />
    }
  }

  return children
}
