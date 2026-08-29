export type ClubUserRole = 'OWNER' | 'MANAGER' | 'STAFF'
export type CreateMembershipRole = Exclude<ClubUserRole, 'OWNER'>
export type PlatformAdminCreateMembershipRole = ClubUserRole

export interface ClubUser {
  id: number
  membership_id: number
  username: string
  first_name: string
  last_name: string
  phone_number?: string | null
  is_user_active?: boolean
  role: ClubUserRole
  club?: number
  club_slug?: string
  court?: number | null
  court_name?: string | null
  membership_is_active?: boolean
  manager_can_settle_transactions?: boolean
  manager_can_change_pricing?: boolean
  can_change_pricing?: boolean
  can_manage_working_hours?: boolean
  can_manage_settlements?: boolean
}

export interface ClubMembershipUserSummary {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  phone_number?: string | null
  is_active: boolean
}

/** Resource shape returned by `/memberships/`, separate from `/users/`. */
export interface ClubMembership {
  id: number
  club: number
  user: number
  user_summary: ClubMembershipUserSummary
  role: ClubUserRole
  court: number | null
  manager_can_settle_transactions: boolean
  manager_can_change_pricing: boolean
  is_active: boolean
  created_by: number | null
  created: string
  modified: string
}

export type MembershipUiState = 'ACTIVE' | 'DEACTIVATED'

export function getMembershipUiState(
  membership: Pick<ClubMembership, 'is_active'>,
): MembershipUiState {
  return membership.is_active ? 'ACTIVE' : 'DEACTIVATED'
}

export interface UpdateManagerPermissionsPayload {
  manager_can_settle_transactions?: boolean
  manager_can_change_pricing?: boolean
}

export interface UpdateMembershipActivityPayload {
  is_active: boolean
}

export interface CreateMembershipUserPayload {
  username: string
  email?: string
  password: string
  first_name: string
  last_name: string
  phone_number?: string
}

export interface CreateMembershipNewUserPayload {
  user: CreateMembershipUserPayload
  role: PlatformAdminCreateMembershipRole
  court?: number | null
  manager_can_settle_transactions?: boolean
  manager_can_change_pricing?: boolean
}

export interface CreateMembershipExistingUserPayload {
  user_id: number
  role: PlatformAdminCreateMembershipRole
  court?: number | null
  manager_can_settle_transactions?: boolean
  manager_can_change_pricing?: boolean
}

export type CreateMembershipPayload =
  | CreateMembershipNewUserPayload
  | CreateMembershipExistingUserPayload

export interface ClubUsersQueryParams {
  role?: ClubUserRole | ''
  court?: number | string
  is_active?: boolean | string
  search?: string
}
