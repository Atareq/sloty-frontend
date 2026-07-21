import type { AuthRole } from '../../core/auth/auth.types'

export interface NavigationItem {
  path: string
  label: string
  marker: string
  allowedRoles: AuthRole[]
  showInMobile: boolean
}

export interface PageHeaderMeta {
  title: string
  subtitle?: string
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
    path: '/dashboard',
    label: 'لوحة التحكم',
    marker: 'ل',
    allowedRoles: ['OWNER', 'MANAGER', 'STAFF'],
    showInMobile: true,
  },
  {
    path: '/schedule',
    label: 'الجدول',
    marker: 'ج',
    allowedRoles: ['OWNER', 'MANAGER', 'STAFF'],
    showInMobile: true,
  },
  {
    path: '/bookings',
    label: 'سجل الحجوزات',
    marker: 'ح',
    allowedRoles: ['OWNER', 'MANAGER', 'STAFF'],
    showInMobile: true,
  },
  {
    path: '/transactions',
    label: 'سجل المعاملات المالية',
    marker: 'د',
    allowedRoles: ['OWNER', 'MANAGER'],
    showInMobile: false,
  },
  {
    path: '/settlements',
    label: 'التسويات المالية والجرد',
    marker: 'ت',
    allowedRoles: ['OWNER', 'MANAGER'],
    showInMobile: false,
  },
  {
    path: '/reports',
    label: 'التقارير الاستهلاكية للملاعب',
    marker: 'ق',
    allowedRoles: ['OWNER'],
    showInMobile: false,
  },
  {
    path: '/audit-logs',
    label: 'سجل النشاطات',
    marker: 'ن',
    allowedRoles: ['OWNER'],
    showInMobile: false,
  },
  {
    path: '/settings/courts',
    label: 'إعدادات الملاعب',
    marker: 'ع',
    allowedRoles: ['OWNER', 'MANAGER'],
    showInMobile: false,
  },
  {
    path: '/settings',
    label: 'الإعدادات',
    marker: 'ض',
    allowedRoles: ['OWNER'],
    showInMobile: false,
  },
  {
    path: '/admin/clubs',
    label: 'الأندية',
    marker: 'أ',
    allowedRoles: ['PLATFORM_ADMIN'],
    showInMobile: false,
  },
  {
    path: '/admin/users',
    label: 'المستخدمون',
    marker: 'س',
    allowedRoles: ['PLATFORM_ADMIN'],
    showInMobile: false,
  },
  {
    path: '/admin/settings',
    label: 'إعدادات المنصة',
    marker: 'ض',
    allowedRoles: ['PLATFORM_ADMIN'],
    showInMobile: false,
  },
]

export const pageHeaderMetaByPath: Record<string, PageHeaderMeta> = {
  '/dashboard': {
    title: 'لوحة التحكم',
    subtitle: 'ملخص اليوم ومؤشرات التشغيل',
  },
  '/schedule': {
    title: 'الجدول',
    subtitle: 'إدارة مواعيد وحجوزات اليوم',
  },
  '/bookings': {
    title: 'سجل الحجوزات',
    subtitle: 'مراجعة وتحديث حجوزات النادي',
  },
  '/transactions': {
    title: 'سجل المعاملات المالية',
    subtitle: 'سجل المدفوعات المسجلة داخل النادي',
  },
  '/settlements': {
    title: 'التسويات المالية والجرد',
    subtitle: 'مراجعة وتسوية دفعات الموظفين',
  },
  '/settlements/history': {
    title: 'التسويات المالية والجرد',
    subtitle: 'متابعة التسويات السابقة وحالات الجرد',
  },
  '/settlements/preview': {
    title: 'مراجعة التسوية',
    subtitle: 'مراجعة الدفعات غير المسواة قبل التأكيد',
  },
  '/reports': {
    title: 'التقارير الاستهلاكية للملاعب',
    subtitle: 'تحليل استخدام الملاعب والحجوزات',
  },
  '/audit-logs': {
    title: 'سجل النشاطات',
    subtitle: 'متابعة التعديلات والإجراءات داخل النادي',
  },
  '/settings': {
    title: 'الإعدادات',
    subtitle: 'إعدادات النادي والصلاحيات',
  },
  '/settings/courts': {
    title: 'إعدادات الملاعب',
    subtitle: 'إدارة الملاعب ومواعيد العمل',
  },
  '/admin/clubs': {
    title: 'الأندية',
    subtitle: 'إدارة أندية المنصة',
  },
  '/admin/users': {
    title: 'المستخدمون',
    subtitle: 'إدارة مستخدمي المنصة',
  },
  '/admin/settings': {
    title: 'إعدادات المنصة',
    subtitle: 'ضبط إعدادات المنصة',
  },
}

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

export function getPageHeaderMeta(pathname: string): PageHeaderMeta {
  if (pageHeaderMetaByPath[pathname]) {
    return pageHeaderMetaByPath[pathname]
  }

  if (
    pathname.startsWith('/settlements/') &&
    pathname !== '/settlements/preview'
  ) {
    return {
      title: 'تفاصيل التسوية',
      subtitle: 'مراجعة تفاصيل التسوية وحالة الدفعات',
    }
  }

  if (pathname.startsWith('/settings/courts/')) {
    return {
      title: 'إعدادات الملعب',
      subtitle: 'إدارة بيانات الملعب ومواعيد العمل',
    }
  }

  return {
    title: 'لوحة التحكم',
    subtitle: 'ملخص اليوم ومؤشرات التشغيل',
  }
}
