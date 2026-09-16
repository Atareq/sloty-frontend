import type { PaginatedResponse } from '../../shared/api/api.types'
import type { PlatformUser, PlatformUserRole } from './adminUsers.types'

export function normalizePlatformUsersResponse(
  response: PlatformUser[] | PaginatedResponse<PlatformUser>,
): PlatformUser[] {
  return Array.isArray(response) ? response : response.results
}

export function getPlatformUserDisplayName(user: PlatformUser): string {
  const fullName = [user.first_name, user.last_name]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ')

  return fullName || user.username
}

/** Returns an Arabic label for the user's profile role. */
export function getPlatformUserRoleLabel(
  role: PlatformUserRole | string | null | undefined,
): string {
  if (role === 'ADMIN') return 'مسؤول منصة'
  if (role === 'OWNER') return 'مالك'
  if (role === 'STAFF') return 'موظف'
  return role ?? 'غير محدد'
}

export function getPlatformUserStatusLabel(
  isActive: boolean | undefined,
): string {
  return isActive === false ? 'غير نشط' : 'نشط'
}
