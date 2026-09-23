/**
 * Platform User types aligned to the /api/v1/users/ schema.
 *
 * Fields removed: memberships[], account_type, is_platform_admin, MANAGER role.
 * Supported roles: ADMIN | OWNER | STAFF (profile_role from backend).
 */

export type PlatformUserRole = 'ADMIN' | 'OWNER' | 'STAFF'

export interface PlatformUser {
  id: number
  username?: string | null
  first_name: string
  last_name: string
  phone_number: string | null
  email: string
  is_active: boolean
  profile_role?: PlatformUserRole | string | null
  created_by?: number | null
}

export interface PlatformUsersQueryParams {
  search?: string
  role?: PlatformUserRole | string
  club?: number | string
  is_active?: boolean | string
  page?: number
}

export interface PlatformAdminUserPayload {
  username?: string
  password: string
  first_name: string
  last_name?: string
  email?: string
  phone_number?: string
  is_active?: boolean
  is_platform_admin?: boolean
}

export type UpdatePlatformUserPayload = Partial<
  Pick<PlatformUser, 'first_name' | 'last_name' | 'email' | 'phone_number' | 'is_active'>
>
