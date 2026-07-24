export type ClubUserRole = 'OWNER' | 'MANAGER' | 'STAFF'

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

export interface UpdateManagerPermissionsPayload {
  manager_can_settle_transactions?: boolean
  manager_can_change_pricing?: boolean
}

export interface ClubUsersQueryParams {
  role?: ClubUserRole | ''
  court?: number | string
  is_active?: boolean | string
  search?: string
}
