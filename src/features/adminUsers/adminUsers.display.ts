import type { PaginatedResponse } from '../../shared/api/api.types'
import type { PlatformUser } from './adminUsers.types'

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

export function getPlatformUserAccountTypeLabel(user: PlatformUser): string {
  if (user.is_platform_admin || user.account_type === 'PLATFORM_ADMIN') {
    return 'مسؤول منصة'
  }

  return 'مستخدم نادي'
}

export function getPlatformUserStatusLabel(
  isActive: boolean | undefined,
): string {
  return isActive === false ? 'غير نشط' : 'نشط'
}
