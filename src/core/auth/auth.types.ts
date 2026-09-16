import type { ReactNode } from 'react'
import type { Club } from '../../features/clubs/clubs.types'
import type { Court } from '../../features/courts/courts.types'

export const AUTH_ROLES = ['ADMIN', 'OWNER', 'STAFF'] as const

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

export interface AccountCreator {
  id: number
  name: string
}

export interface CurrentUserProfile {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  phone_number: string | null
  is_active: boolean
  profile_role: AuthRole | null
  account_created_by: AccountCreator | null
}

export interface AuthContextValue {
  accessToken: string | null
  claims: AuthClaims | null
  currentUser: CurrentUserProfile | null
  selectedClubSlug: string | null
  accessibleClubs: Club[]
  selectedCourtId: number | null
  accessibleCourts: Court[]
  role: AuthRole | null
  isAuthenticated: boolean
  isLoadingSession: boolean
  isTokenExpired: boolean
  sessionError: string | null
  login: (accessToken: string, refreshToken?: string) => AuthRole | null
  logout: () => Promise<void>
  selectClub: (slug: string) => void
  clearSelectedClub: () => void
  selectCourt: (id: number | null) => void
  refreshCurrentUser: () => Promise<void>
  setTokens: (tokens: AuthTokens) => void
}

export interface AuthProviderProps {
  children: ReactNode
}

export const DEFAULT_ROLE_REDIRECTS: Record<AuthRole, string> = {
  ADMIN: '/admin/clubs',
  OWNER: '/schedule',
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

export function canManagePricing(role: AuthRole | null): boolean {
  return role === 'ADMIN' || role === 'OWNER'
}

export const canChangePricing = canManagePricing

export function canManageWorkingHours(role: AuthRole | null): boolean {
  return role === 'ADMIN' || role === 'OWNER'
}

export function canManageSettlements(role: AuthRole | null): boolean {
  return role === 'ADMIN' || role === 'OWNER'
}

/**
 * Cancellation refund policy is an owner/admin setting.
 */
export function canManageCancellationRefundPolicy(
  role: AuthRole | null,
): boolean {
  return role === 'ADMIN' || role === 'OWNER'
}

/**
 * Settlement visibility is broader than settlement management. Staff can
 * review their own current unsettled preview, while creation/approval
 * stays behind canManageSettlements().
 */
export function canViewOwnSettlements(role: AuthRole | null): boolean {
  return role === 'ADMIN' || role === 'OWNER' || role === 'STAFF'
}

/**
 * Whether the user can select an operational court in the UI.
 * Returns true if more than one court exists, or for Owner/Admin.
 */
export function canChooseOperationalCourt(
  role: AuthRole | null,
  courtsCountOrCourts?: { id: number }[] | number | null,
): boolean {
  if (role === 'ADMIN' || role === 'OWNER') {
    return true
  }
  if (Array.isArray(courtsCountOrCourts)) {
    return courtsCountOrCourts.length > 1
  }
  if (typeof courtsCountOrCourts === 'number') {
    return courtsCountOrCourts > 1
  }
  return false
}

/**
 * Optional helper returning court ID when staff is assigned to exactly one court.
 */
export function getAssignedOperationalCourtId(
  role: AuthRole | null,
  courtsCountOrCourts?: { id: number }[] | number | null,
): number | null {
  if (role !== 'STAFF') {
    return null
  }
  if (Array.isArray(courtsCountOrCourts)) {
    return courtsCountOrCourts.length === 1 ? (courtsCountOrCourts[0]?.id ?? null) : null
  }
  return null
}

