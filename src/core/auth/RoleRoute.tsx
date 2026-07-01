import type { ReactNode } from 'react'
import { Navigate } from 'react-router'
import type { AuthRole } from './auth.types'
import { getDefaultRouteForRole } from './auth.types'
import { useAuth } from './useAuth'

export interface RoleRouteProps {
  allowedRoles: AuthRole[]
  children: ReactNode
}

/**
 * Frontend route guard for role-specific UX.
 *
 * It redirects authenticated users without the allowed role to their default
 * frontend landing page. It is not a backend authorization boundary.
 */
export function RoleRoute({ allowedRoles, children }: RoleRouteProps) {
  const { isAuthenticated, isLoadingSession, role } = useAuth()

  if (isLoadingSession) {
    return <p className="p-4 text-sm font-semibold">جاري تحميل الجلسة...</p>
  }

  if (!isAuthenticated || !role) {
    return <Navigate replace to="/login" />
  }

  if (!allowedRoles.includes(role)) {
    return <Navigate replace to={getDefaultRouteForRole(role)} />
  }

  return children
}
