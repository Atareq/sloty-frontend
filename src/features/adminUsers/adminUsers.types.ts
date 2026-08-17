import type { ClubUser } from '../clubUsers/clubUsers.types'

export type PlatformUserAccountType = 'PLATFORM_ADMIN' | 'CLUB_USER'

export interface PlatformUserMembershipSummary
  extends Partial<
    Pick<
      ClubUser,
      | 'membership_id'
      | 'role'
      | 'court'
      | 'court_name'
      | 'membership_is_active'
      | 'manager_can_settle_transactions'
      | 'manager_can_change_pricing'
      | 'can_change_pricing'
      | 'can_manage_working_hours'
      | 'can_manage_settlements'
    >
  > {
  club?: number | string
  club_id?: number | string
  club_name?: string
  club_slug?: string
}

export interface PlatformUser {
  id: number
  username: string
  first_name?: string
  last_name?: string
  phone_number?: string | null
  email?: string | null
  is_active?: boolean
  is_platform_admin?: boolean
  account_type?: PlatformUserAccountType | string
  memberships?: PlatformUserMembershipSummary[]
}

export interface PlatformUsersQueryParams {
  search?: string
  account_type?: PlatformUserAccountType | string
  club?: number | string
  role?: string
  is_active?: boolean | string
}

export interface PlatformAdminUserPayload {
  username: string
  password: string
  first_name: string
  last_name?: string
  email?: string
  phone_number?: string
  is_active?: boolean
}

export type UpdatePlatformUserPayload = Partial<Pick<PlatformUser, 'is_active'>>
