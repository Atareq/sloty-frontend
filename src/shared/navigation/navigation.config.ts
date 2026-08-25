import {
  canManageSettlements,
  type AuthRole,
  type CurrentUserMembership,
} from '../../core/auth/auth.types'

export interface NavigationItem {
  path: string
  label: string
  marker: string
  allowedRoles: AuthRole[]
  showInMobile: boolean
  showInPrimaryNav: boolean
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
 * `showInMobile` is retained for route metadata compatibility.
 * `showInPrimaryNav` keeps routable detail pages out of drawer/sidebar chrome.
 */
export const navigationItems: NavigationItem[] = [
  {
    path: '/dashboard',
    label: 'الرئيسية',
    marker: 'ر',
    allowedRoles: ['OWNER', 'MANAGER', 'STAFF'],
    showInMobile: true,
    showInPrimaryNav: true,
  },
  {
    path: '/schedule',
    label: 'الجدول',
    marker: 'ج',
    allowedRoles: ['OWNER', 'MANAGER', 'STAFF'],
    showInMobile: true,
    showInPrimaryNav: true,
  },
  {
    path: '/bookings',
    label: 'سجل الحجوزات',
    marker: 'ح',
    allowedRoles: ['OWNER', 'MANAGER', 'STAFF'],
    showInMobile: true,
    showInPrimaryNav: true,
  },
  {
    path: '/transactions',
    label: 'التحصيلات',
    marker: 'د',
    allowedRoles: ['OWNER', 'MANAGER', 'STAFF'],
    showInMobile: false,
    showInPrimaryNav: true,
  },
  {
    path: '/settlements',
    label: 'عهد الموظفين',
    marker: 'ت',
    allowedRoles: ['OWNER', 'MANAGER', 'STAFF'],
    showInMobile: false,
    showInPrimaryNav: true,
  },
  {
    path: '/reports',
    label: 'التقارير الاستهلاكية للملاعب',
    marker: 'ق',
    allowedRoles: ['OWNER', 'MANAGER'],
    showInMobile: false,
    showInPrimaryNav: true,
  },
  {
    path: '/audit-logs',
    label: 'سجل النشاطات',
    marker: 'ن',
    allowedRoles: ['OWNER'],
    showInMobile: false,
    showInPrimaryNav: false,
  },
  {
    path: '/settings/courts',
    label: 'إعدادات الملاعب',
    marker: 'ع',
    allowedRoles: ['OWNER', 'MANAGER'],
    showInMobile: false,
    showInPrimaryNav: false,
  },
  {
    path: '/settings',
    label: 'الإعدادات',
    marker: 'ض',
    allowedRoles: ['OWNER', 'MANAGER'],
    showInMobile: false,
    showInPrimaryNav: true,
  },
  {
    path: '/settings/users',
    label: 'المستخدمون والصلاحيات',
    marker: 'ص',
    allowedRoles: ['OWNER'],
    showInMobile: false,
    showInPrimaryNav: false,
  },
  {
    path: '/admin/clubs',
    label: 'الأندية',
    marker: 'أ',
    allowedRoles: ['PLATFORM_ADMIN'],
    showInMobile: false,
    showInPrimaryNav: true,
  },
  {
    path: '/admin/users',
    label: 'المستخدمون',
    marker: 'س',
    allowedRoles: ['PLATFORM_ADMIN'],
    showInMobile: false,
    showInPrimaryNav: true,
  },
  {
    path: '/admin/settings',
    label: 'إعدادات المنصة',
    marker: 'ض',
    allowedRoles: ['PLATFORM_ADMIN'],
    showInMobile: false,
    showInPrimaryNav: false,
  },
]

export const pageHeaderMetaByPath: Record<string, PageHeaderMeta> = {
  '/dashboard': {
    title: 'الرئيسية',
    subtitle: 'متابعة شغل النهاردة والحجوزات اللي محتاجة إجراء',
  },
  '/schedule': {
    title: 'الجدول',
    subtitle: 'إدارة مواعيد وحجوزات اليوم',
  },
  '/bookings': {
    title: 'سجل الحجوزات',
    subtitle: 'قائمة مراجعة الحجوزات حسب الفلاتر',
  },
  '/transactions': {
    title: 'التحصيلات',
    subtitle: 'مراجعة التحصيلات والاستردادات المسجلة',
  },
  '/settlements': {
    title: 'عهد الموظفين',
    subtitle: 'مراجعة المبالغ التي مع الموظفين وسجل الاستلام',
  },
  '/settlements/history': {
    title: 'سجل العهد',
    subtitle: 'متابعة العهد التي تم استلامها سابقًا',
  },
  '/settlements/preview': {
    title: 'مراجعة العهدة',
    subtitle: 'راجع التحصيلات غير المسواة قبل تأكيد الاستلام',
  },
  '/reports': {
    title: 'التقارير الاستهلاكية للملاعب',
    subtitle: 'تحليل إشغال الملاعب والطلب حسب الفترة والموظف',
  },
  '/audit-logs': {
    title: 'سجل النشاطات',
    subtitle: 'متابعة التغييرات المهمة داخل النادي',
  },
  '/settings': {
    title: 'الإعدادات',
    subtitle: 'إعدادات النادي والصلاحيات',
  },
  '/settings/users': {
    title: 'المستخدمون والصلاحيات',
    subtitle: 'مراجعة أعضاء النادي وصلاحيات المديرين',
  },
  '/settings/courts': {
    title: 'إعدادات الملاعب',
    subtitle: 'إدارة أسعار ومواعيد عمل ملاعب النادي المحدد',
  },
  '/admin/clubs': {
    title: 'إدارة الأندية',
    subtitle: 'إعداد الأندية الأساسية قبل إضافة الملاعب وساعات العمل',
  },
  '/admin/users': {
    title: 'إدارة المستخدمين',
    subtitle: 'إدارة حسابات المنصة وعضويات الأندية',
  },
  '/admin/settings': {
    title: 'إعدادات المنصة',
    subtitle: 'ضبط إعدادات المنصة',
  },
}

export function getNavigationItemsForRole(
  role: AuthRole,
  options: { mobileOnly?: boolean; primaryOnly?: boolean } = {},
  membership: CurrentUserMembership | null = null,
): NavigationItem[] {
  return navigationItems
    .filter((item) =>
      item.allowedRoles.includes(role) &&
      (!options.mobileOnly || item.showInMobile) &&
      (!options.primaryOnly || item.showInPrimaryNav),
    )
    .map((item) => {
      if (item.path === '/transactions' && role === 'STAFF') {
        return { ...item, label: 'تحصيلاتي' }
      }

      if (
        item.path === '/settlements' &&
        membership &&
        !canManageSettlements(membership, role)
      ) {
        return { ...item, label: 'عهدتي' }
      }

      return item
    })
}

export function canRoleAccessPath(role: AuthRole, path: string): boolean {
  return navigationItems.some(
    (item) => item.path === path && item.allowedRoles.includes(role),
  )
}

export function getAllNavigationRoles(): AuthRole[] {
  return allRoles
}

export function getPageHeaderMeta(
  pathname: string,
  role: AuthRole | null = null,
  membership: CurrentUserMembership | null = null,
): PageHeaderMeta {
  if (pathname === '/transactions' && role === 'STAFF') {
    return {
      title: 'تحصيلاتي',
      subtitle: 'التحصيلات والاستردادات المسجلة على ملعبك',
    }
  }

  if (
    pathname === '/settlements' &&
    role &&
    !canManageSettlements(membership, role)
  ) {
    return {
      title: 'عهدتي',
      subtitle: 'المبلغ الذي معك الآن وسجل العهد السابقة',
    }
  }

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

  if (pathname === '/admin/users/new') {
    return {
      title: 'إضافة مستخدم',
      subtitle: 'استخدم نفس عقد إنشاء الحسابات والعضويات المعتمد في الواجهة',
    }
  }

  if (pathname.startsWith('/admin/users/')) {
    return {
      title: 'تفاصيل المستخدم',
      subtitle: 'تفاصيل الحساب والعضويات كما يرسلها الخادم',
    }
  }

  if (pathname === '/more') {
    return {
      title: 'المزيد',
      subtitle: 'مسار مؤقت للمزيد من إجراءات الموظف والمدير',
    }
  }

  if (pathname === '/admin/clubs/new') {
    return {
      title: 'إضافة نادي',
      subtitle: 'بيانات النادي الأساسية',
    }
  }

  if (pathname.match(/^\/admin\/clubs\/[^/]+\/courts\/new$/)) {
    return {
      title: 'إضافة ملعب',
      subtitle: 'بيانات الملعب الأساسية التي يعتمد عليها جدول الحجز لاحقًا',
    }
  }

  if (pathname.match(/^\/admin\/clubs\/[^/]+\/courts\/[^/]+$/)) {
    return {
      title: 'تعديل ملعب',
      subtitle: 'بيانات الملعب الأساسية التي يعتمد عليها جدول الحجز لاحقًا',
    }
  }

  if (pathname.match(/^\/admin\/clubs\/[^/]+\/courts$/)) {
    return {
      title: 'إدارة الملاعب',
      subtitle: 'ملاعب النادي المحدد',
    }
  }

  if (pathname.startsWith('/admin/clubs/')) {
    return {
      title: 'تعديل النادي',
      subtitle: 'بيانات النادي الأساسية',
    }
  }

  return {
    title: 'لوحة التحكم',
    subtitle: 'ملخص اليوم ومؤشرات التشغيل',
  }
}
