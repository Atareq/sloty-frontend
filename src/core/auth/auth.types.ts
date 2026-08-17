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
  is_active: boolean
}

export interface CurrentUserMembershipCourt {
  id: number
  name: string
}

export interface MembershipPermissions {
  can_change_pricing: boolean
  can_manage_working_hours: boolean
  can_manage_settlements: boolean
}

export interface CurrentUserMembership {
  id: number
  role: Exclude<AuthRole, 'PLATFORM_ADMIN'>
  club: CurrentUserMembershipClub
  court: CurrentUserMembershipCourt | null
  permissions?: MembershipPermissions
  manager_can_settle_transactions?: boolean
  manager_can_change_pricing?: boolean
  can_change_pricing?: boolean
  can_manage_working_hours?: boolean
  can_manage_settlements?: boolean
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
  is_platform_admin: boolean
  account_created_by: AccountCreator | null
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

const noMembershipPermissions: MembershipPermissions = {
  can_change_pricing: false,
  can_manage_working_hours: false,
  can_manage_settlements: false,
}

const allMembershipPermissions: MembershipPermissions = {
  can_change_pricing: true,
  can_manage_working_hours: true,
  can_manage_settlements: true,
}

function hasEffectiveTopLevelPermissions(
  membership: CurrentUserMembership,
): boolean {
  return (
    membership.can_change_pricing !== undefined ||
    membership.can_manage_working_hours !== undefined ||
    membership.can_manage_settlements !== undefined
  )
}

function hasRawManagerPermissions(membership: CurrentUserMembership): boolean {
  return (
    membership.manager_can_change_pricing !== undefined ||
    membership.manager_can_settle_transactions !== undefined
  )
}

/**
 * Resolves the selected membership's effective permission object.
 *
 * TODO: remove legacy top-level and raw manager permission fallbacks after the
 * backend deployment is complete.
 */
export function resolveMembershipPermissions(
  membership: CurrentUserMembership | null,
): MembershipPermissions {
  if (!membership) {
    return noMembershipPermissions
  }

  if (membership.permissions) {
    return membership.permissions
  }

  if (hasEffectiveTopLevelPermissions(membership)) {
    return {
      can_change_pricing: Boolean(membership.can_change_pricing),
      can_manage_working_hours: Boolean(membership.can_manage_working_hours),
      can_manage_settlements: Boolean(membership.can_manage_settlements),
    }
  }

  if (membership.role === 'MANAGER' && hasRawManagerPermissions(membership)) {
    const canChangePricing = Boolean(membership.manager_can_change_pricing)

    return {
      can_change_pricing: canChangePricing,
      can_manage_working_hours: canChangePricing,
      can_manage_settlements: Boolean(
        membership.manager_can_settle_transactions,
      ),
    }
  }

  return noMembershipPermissions
}

export function getActiveMembershipPermissions(
  role: AuthRole | null,
  membership: CurrentUserMembership | null,
): MembershipPermissions {
  if (role === 'PLATFORM_ADMIN' || membership?.role === 'OWNER') {
    return allMembershipPermissions
  }

  if (!membership || membership.role === 'STAFF') {
    return noMembershipPermissions
  }

  return resolveMembershipPermissions(membership)
}

export function canManagePricing(
  membership: CurrentUserMembership | null,
  role: AuthRole | null = null,
): boolean {
  return getActiveMembershipPermissions(role, membership).can_change_pricing
}

export const canChangePricing = canManagePricing

export function canManageWorkingHours(
  membership: CurrentUserMembership | null,
  role: AuthRole | null = null,
): boolean {
  return getActiveMembershipPermissions(
    role,
    membership,
  ).can_manage_working_hours
}

export function canManageSettlements(
  membership: CurrentUserMembership | null,
  role: AuthRole | null = null,
): boolean {
  return getActiveMembershipPermissions(
    role,
    membership,
  ).can_manage_settlements
}

/**
 * Cancellation refund policy is an owner/platform setting, separate from
 * pricing and working-hours manager permissions.
 */
export function canManageCancellationRefundPolicy(
  membership: CurrentUserMembership | null,
  role: AuthRole | null = null,
): boolean {
  return role === 'PLATFORM_ADMIN' || membership?.role === 'OWNER'
}

/**
 * Settlement visibility is broader than settlement management. Staff and
 * restricted managers can review their own current unsettled preview, while
 * creation/approval stays behind canManageSettlements().
 */
export function canViewOwnSettlements(
  membership: CurrentUserMembership | null,
  role: AuthRole | null = null,
): boolean {
  if (role === 'PLATFORM_ADMIN') {
    return true
  }

  return ['OWNER', 'MANAGER', 'STAFF'].includes(membership?.role ?? '')
}

/**
 * Returns the fixed operational court for Staff UX. This helper is only for
 * frontend presentation and request shaping; backend permissions remain
 * authoritative.
 */
export function getAssignedOperationalCourtId(
  role: AuthRole | null,
  membership: CurrentUserMembership | null,
): number | null {
  if (role !== 'STAFF' && membership?.role !== 'STAFF') {
    return null
  }

  return membership?.court?.id ?? null
}

export function canChooseOperationalCourt(
  role: AuthRole | null,
  membership: CurrentUserMembership | null,
): boolean {
  return role !== 'STAFF' && membership?.role !== 'STAFF'
}
