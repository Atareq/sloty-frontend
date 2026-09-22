export type ClubUserRole = 'OWNER' | 'STAFF' | 'ADMIN'

export interface ClubUser {
  id: number
  profile_id?: number
  user_id?: number
  username?: string
  first_name: string
  last_name: string
  email?: string | null
  phone_number?: string | null
  is_active: boolean
  is_enabled?: boolean
  role?: ClubUserRole | string
  profile_role?: ClubUserRole | string | null
  created_by?: number | null
  court?: number | null
  court_name?: string | null
  court_ids?: number[]
  courts?: { id: number; name: string; is_active: boolean }[]
  can_change_pricing?: boolean
  can_manage_working_hours?: boolean
  can_manage_settlements?: boolean
}

export interface UpdateManagerPermissionsPayload {
  can_change_pricing?: boolean
  can_manage_working_hours?: boolean
  can_manage_settlements?: boolean
  manager_can_settle_transactions?: boolean
  manager_can_change_pricing?: boolean
}

export interface CreateClubStaffPayload {
  club_slug?: string
  username?: string
  password: string
  first_name: string
  last_name?: string
  email?: string
  phone_number?: string | null
  is_active?: boolean
  court_ids?: number[]
}

export type UpdateClubUserPayload = Partial<
  Pick<ClubUser, 'first_name' | 'last_name' | 'email' | 'phone_number' | 'is_active'>
>

export interface ClubUsersQueryParams {
  role?: string
  is_active?: boolean | string
  search?: string
  page?: number
}

export function getUserUiState(user: { is_active?: boolean }): 'ACTIVE' | 'DEACTIVATED' {
  return user.is_active === false ? 'DEACTIVATED' : 'ACTIVE'
}
