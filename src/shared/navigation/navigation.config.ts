import type { AuthRole } from '../../core/auth/auth.types'

export interface NavigationItem {
  path: string
  label: string
  marker: string
  allowedRoles: AuthRole[]
  showInMobile: boolean
}

const allRoles: AuthRole[] = [
  'platform_super_admin',
  'club_owner',
  'club_manager',
  'court_staff',
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
    allowedRoles: ['club_owner', 'club_manager', 'court_staff'],
    showInMobile: true,
  },
  {
    path: '/bookings',
    label: 'الحجوزات',
    marker: 'ح',
    allowedRoles: ['club_owner', 'club_manager', 'court_staff'],
    showInMobile: true,
  },
  {
    path: '/dashboard',
    label: 'لوحة التحكم',
    marker: 'ل',
    allowedRoles: ['club_owner', 'club_manager'],
    showInMobile: true,
  },
  {
    path: '/settlements',
    label: 'التسويات',
    marker: 'ت',
    allowedRoles: ['club_owner'],
    showInMobile: true,
  },
  {
    path: '/reports',
    label: 'التقارير',
    marker: 'ق',
    allowedRoles: ['club_owner'],
    showInMobile: true,
  },
  {
    path: '/settings',
    label: 'الإعدادات',
    marker: 'ع',
    allowedRoles: ['club_owner'],
    showInMobile: false,
  },
  {
    path: '/more',
    label: 'المزيد',
    marker: 'م',
    allowedRoles: ['club_manager', 'court_staff'],
    showInMobile: true,
  },
  {
    path: '/admin/clubs',
    label: 'الأندية',
    marker: 'أ',
    allowedRoles: ['platform_super_admin'],
    showInMobile: true,
  },
  {
    path: '/admin/users',
    label: 'المستخدمون',
    marker: 'س',
    allowedRoles: ['platform_super_admin'],
    showInMobile: true,
  },
  {
    path: '/admin/settings',
    label: 'إعدادات المنصة',
    marker: 'ض',
    allowedRoles: ['platform_super_admin'],
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
