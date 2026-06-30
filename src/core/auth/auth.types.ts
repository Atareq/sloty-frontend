import type { ReactNode } from 'react'

export const AUTH_ROLES = [
  'platform_super_admin',
  'club_owner',
  'club_manager',
  'court_staff',
] as const

export type AuthRole = (typeof AUTH_ROLES)[number]

export interface AuthClaims {
  user_id: number
  role: AuthRole
  name?: string
  club_id?: number
  court_id?: number
  exp?: number
}

export interface AuthTokens {
  accessToken: string
  refreshToken?: string
}

export interface AuthContextValue {
  accessToken: string | null
  claims: AuthClaims | null
  role: AuthRole | null
  isAuthenticated: boolean
  isTokenExpired: boolean
  login: (accessToken: string, refreshToken?: string) => void
  logout: () => void
  setTokens: (tokens: AuthTokens) => void
}

export interface AuthProviderProps {
  children: ReactNode
}

export const DEFAULT_ROLE_REDIRECTS: Record<AuthRole, string> = {
  platform_super_admin: '/admin/clubs',
  club_owner: '/dashboard',
  club_manager: '/schedule',
  court_staff: '/schedule',
}

/**
 * Returns the UX landing route for an authenticated frontend role.
 *
 * This is a frontend navigation decision only. Backend permissions remain
 * outside the frontend scope.
 */
export function getDefaultRouteForRole(role: AuthRole): string {
  return DEFAULT_ROLE_REDIRECTS[role]
}
