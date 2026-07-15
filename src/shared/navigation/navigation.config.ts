import type { AuthRole } from '../../core/auth/auth.types'

export interface NavigationItem {
  path: string
  label: string
  marker: string
  allowedRoles: AuthRole[]
  showInMobile: boolean
}

const allRoles: AuthRole[] = [
  'PLATFORM_ADMIN',
  'OWNER',
  'MANAGER',
  'STAFF',
]

/**
 * Single role-based navigation source for desktop and mobile shells.
 *
 * `showInMobile` keeps the bottom navigation focused on main actions while
 * desktop can expose the complete role menu.
 */
export const navigationItems: NavigationItem[] = [
  {
    path: '/schedule',
    label: 'الجدول',
    marker: 'ج',
    allowedRoles: ['OWNER', 'MANAGER', 'STAFF'],
    showInMobile: true,
  },
  {
    path: '/bookings',
    label: 'الحجوزات',
    marker: 'ح',
    allowedRoles: ['OWNER', 'MANAGER', 'STAFF'],
    showInMobile: true,
  },
  {
    path: '/transactions',
    label: 'المعاملات',
    marker: 'د',
    allowedRoles: ['OWNER', 'MANAGER', 'STAFF'],
    showInMobile: true,
  },
  {
    path: '/dashboard',
    label: 'لوحة التحكم',
    marker: 'ل',
    allowedRoles: ['OWNER', 'MANAGER'],
    showInMobile: true,
  },
  {
    path: '/settlements',
    label: 'التسويات',
    marker: 'ت',
    allowedRoles: ['OWNER', 'MANAGER'],
    showInMobile: true,
  },
  {
    path: '/reports',
    label: 'التقارير',
    marker: 'ق',
    allowedRoles: ['OWNER'],
    showInMobile: true,
  },
  {
    path: '/settings/courts',
    label: 'إعدادات الملاعب',
    marker: 'ع',
    allowedRoles: ['OWNER', 'MANAGER'],
    showInMobile: false,
  },
  {
    path: '/more',
    label: 'المزيد',
    marker: 'م',
    allowedRoles: ['MANAGER', 'STAFF'],
    showInMobile: true,
  },
  {
    path: '/admin/clubs',
    label: 'الأندية',
    marker: 'أ',
    allowedRoles: ['PLATFORM_ADMIN'],
    showInMobile: true,
  },
  {
    path: '/admin/users',
    label: 'المستخدمون',
    marker: 'س',
    allowedRoles: ['PLATFORM_ADMIN'],
    showInMobile: true,
  },
  {
    path: '/admin/settings',
    label: 'إعدادات المنصة',
    marker: 'ض',
    allowedRoles: ['PLATFORM_ADMIN'],
    showInMobile: true,
  },
]

export function getNavigationItemsForRole(
  role: AuthRole,
  options: { mobileOnly?: boolean } = {},
): NavigationItem[] {
  return navigationItems.filter(
    (item) =>
      item.allowedRoles.includes(role) &&
      (!options.mobileOnly || item.showInMobile),
  )
}

export function canRoleAccessPath(role: AuthRole, path: string): boolean {
  return navigationItems.some(
    (item) => item.path === path && item.allowedRoles.includes(role),
  )
}

export function getAllNavigationRoles(): AuthRole[] {
  return allRoles
}
