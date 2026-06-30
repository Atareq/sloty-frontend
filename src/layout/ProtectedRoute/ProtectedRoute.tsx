import type { ReactNode } from 'react'
import { Navigate } from 'react-router'
import { isAuthenticated } from '../../core/auth/authStorage'

export interface ProtectedRouteProps {
  children: ReactNode
}

/**
 * Placeholder route guard for frontend-only navigation.
 *
 * It checks only the temporary sessionStorage token. Real role permissions,
 * backend validation, and refresh flows must be designed after API contracts
 * exist.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />
  }

  return children
}
