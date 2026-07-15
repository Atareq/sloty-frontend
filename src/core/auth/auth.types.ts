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
  role?: AuthRole
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

export interface CurrentUserMembershipClub {
  id: number
  slug: string
  name: string
  governorate?: string
  city?: string
  address?: string
  phone_number?: string
  manager_can_settle_transactions?: boolean
  manager_can_change_pricing?: boolean
  is_active: boolean
}

export interface CurrentUserMembershipCourt {
  id: number
  name: string
}

export interface CurrentUserMembership {
  id: number
  role: Exclude<AuthRole, 'PLATFORM_ADMIN'>
  club: CurrentUserMembershipClub
  court: CurrentUserMembershipCourt | null
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
  requires_club_selection: boolean
  memberships: CurrentUserMembership[]
}

export interface AuthContextValue {
  accessToken: string | null
  claims: AuthClaims | null
  currentUser: CurrentUserProfile | null
  selectedClubSlug: string | null
  selectedMembership: CurrentUserMembership | null
  role: AuthRole | null
  isAuthenticated: boolean
  isLoadingSession: boolean
  isTokenExpired: boolean
  sessionError: string | null
  login: (accessToken: string, refreshToken?: string) => AuthRole | null
  logout: () => void
  selectClub: (slug: string) => void
  clearSelectedClub: () => void
  refreshCurrentUser: () => Promise<void>
  setTokens: (tokens: AuthTokens) => void
}

export interface AuthProviderProps {
  children: ReactNode
}

export const DEFAULT_ROLE_REDIRECTS: Record<AuthRole, string> = {
  PLATFORM_ADMIN: '/admin/clubs',
  OWNER: '/dashboard',
  MANAGER: '/dashboard',
  STAFF: '/dashboard',
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
