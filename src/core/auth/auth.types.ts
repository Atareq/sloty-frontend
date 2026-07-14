import type { ReactNode } from 'react'

export const AUTH_ROLES = [
  'PLATFORM_ADMIN',
  'OWNER',
  'MANAGER',
  'STAFF',
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

export interface TokenPair {
  access: string
  refresh: string
}

export interface LoginRequest {
  username: string
  password: string
  club_slug?: string
}

export interface RefreshTokenRequest {
  refresh: string
}

export interface CurrentUserProfile {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  phone_number: string | null
  is_active: boolean
  is_platform_admin: boolean
  memberships: unknown
}

export interface AuthContextValue {
  accessToken: string | null
  claims: AuthClaims | null
  currentUser: CurrentUserProfile | null
  role: AuthRole | null
  isAuthenticated: boolean
  isLoadingSession: boolean
  isTokenExpired: boolean
  sessionError: string | null
  login: (accessToken: string, refreshToken?: string) => AuthRole | null
  logout: () => void
  refreshCurrentUser: () => Promise<void>
  setTokens: (tokens: AuthTokens) => void
}

export interface AuthProviderProps {
  children: ReactNode
}

export const DEFAULT_ROLE_REDIRECTS: Record<AuthRole, string> = {
  PLATFORM_ADMIN: '/admin/clubs',
  OWNER: '/dashboard',
  MANAGER: '/schedule',
  STAFF: '/schedule',
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
