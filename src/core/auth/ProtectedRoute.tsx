import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useAuth } from './useAuth'

export interface ProtectedRouteProps {
  children: ReactNode
}

/**
 * Frontend route guard for authenticated-only screens.
 *
 * This improves route UX only. Backend permission checks remain authoritative.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation()
  const { isAuthenticated, isLoadingSession } = useAuth()

  if (isLoadingSession) {
    return <p className="p-4 text-sm font-semibold">جاري تحميل الجلسة...</p>
  }

  if (!isAuthenticated) {
    return <Navigate replace state={{ from: location }} to="/login" />
  }

  return children
}
