import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  Building2,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  Receipt,
  ScrollText,
  Settings,
  Users,
  Wallet,
} from 'lucide-react'
import {
  canManageSettlements,
  type AuthRole,
  type CurrentUserMembership,
} from '../../core/auth/auth.types'
import { auditCopy, appNavCopy } from '../copy/appCopy'

export interface NavigationItem {
  path: string
  label: string
  icon: LucideIcon
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
 * Owner/Manager transaction ledger stays routable but out of primary nav.
 */
export const navigationItems: NavigationItem[] = [
  {
    path: '/schedule',
    label: appNavCopy.home,
    icon: CalendarDays,
    allowedRoles: ['OWNER', 'MANAGER', 'STAFF'],
    showInMobile: true,
    showInPrimaryNav: true,
  },
  {
    path: '/dashboard',
    label: appNavCopy.followUp,
    icon: LayoutDashboard,
    allowedRoles: ['OWNER', 'MANAGER', 'STAFF'],
    showInMobile: false,
    showInPrimaryNav: false,
  },
  {
    path: '/bookings',
    label: appNavCopy.bookings,
    icon: ClipboardList,
    allowedRoles: ['OWNER', 'MANAGER', 'STAFF'],
    showInMobile: true,
    showInPrimaryNav: true,
  },
  {
    path: '/transactions',
    label: appNavCopy.transactionsManagement,
    icon: Receipt,
    allowedRoles: ['OWNER', 'MANAGER', 'STAFF'],
    showInMobile: false,
    showInPrimaryNav: true,
  },
  {
    path: '/settlements',
    label: appNavCopy.moneyManagement,
    icon: Wallet,
    allowedRoles: ['OWNER', 'MANAGER', 'STAFF'],
    showInMobile: false,
    showInPrimaryNav: true,
  },
  {
    path: '/reports',
    label: appNavCopy.reports,
    icon: BarChart3,
    allowedRoles: ['OWNER', 'MANAGER'],
    showInMobile: false,
    showInPrimaryNav: true,
  },
  {
    path: '/audit-logs',
    label: appNavCopy.audit,
    icon: ScrollText,
    allowedRoles: ['OWNER'],
    showInMobile: false,
    showInPrimaryNav: false,
  },
  {
    path: '/settings/courts',
    label: 'إعدادات الملاعب',
    icon: Settings,
    allowedRoles: ['OWNER', 'MANAGER'],
    showInMobile: false,
    showInPrimaryNav: false,
  },
  {
    path: '/settings',
    label: appNavCopy.settings,
    icon: Settings,
    allowedRoles: ['OWNER', 'MANAGER'],
    showInMobile: false,
    showInPrimaryNav: true,
  },
  {
    path: '/settings/users',
    label: 'المستخدمون والصلاحيات',
    icon: Users,
    allowedRoles: ['OWNER'],
    showInMobile: false,
    showInPrimaryNav: false,
  },
  {
    path: '/admin/clubs',
    label: 'الأندية',
    icon: Building2,
    allowedRoles: ['PLATFORM_ADMIN'],
    showInMobile: false,
    showInPrimaryNav: true,
  },
  {
    path: '/admin/users',
    label: 'المستخدمون',
    icon: Users,
    allowedRoles: ['PLATFORM_ADMIN'],
    showInMobile: false,
    showInPrimaryNav: true,
  },
  {
    path: '/admin/settings',
    label: 'إعدادات المنصة',
    icon: Settings,
    allowedRoles: ['PLATFORM_ADMIN'],
    showInMobile: false,
    showInPrimaryNav: false,
  },
]

export const pageHeaderMetaByPath: Record<string, PageHeaderMeta> = {
  '/dashboard': {
    title: appNavCopy.followUp,
    subtitle: 'متابعة شغل النهاردة والحجوزات اللي محتاجة إجراء',
  },
  '/schedule': {
    title: appNavCopy.home,
    subtitle: 'اختار اليوم وبعدين اختار المعاد',
  },
  '/bookings': {
    title: appNavCopy.bookings,
    subtitle: 'قائمة مراجعة الحجوزات حسب الفلاتر',
  },
  '/transactions': {
    title: appNavCopy.transactionsManagement,
    subtitle: 'ابحث وراجع كل المعاملات المالية المسجلة في النادي.',
  },
  '/settlements': {
    title: appNavCopy.moneyManagement,
    subtitle:
      'تابع المبالغ اللي لسه مع موظفينك،\nاستلمها وراجع العمليات المالية عند الحاجة.',
  },
  '/settlements/history': {
    title: 'تم استلامها سابقًا',
    subtitle: 'متابعة المبالغ التي تم استلامها سابقًا',
  },
  '/settlements/preview': {
    title: 'استلام المبلغ',
    subtitle: 'راجع المبلغ قبل تأكيد الاستلام',
  },
  '/reports': {
    title: appNavCopy.reports,
    subtitle: 'تحليل إشغال الملاعب والطلب حسب الفترة والموظف',
  },
  '/audit-logs': {
    title: appNavCopy.audit,
    subtitle: auditCopy.helper,
  },
  '/settings': {
    title: appNavCopy.settings,
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
      (!options.primaryOnly || item.showInPrimaryNav) &&
      // Owner/Manager ledger stays a secondary destination, not a Burger item.
      (item.path !== '/transactions' || role === 'STAFF'),
    )
    .map((item) => {
      if (item.path === '/transactions' && role === 'STAFF') {
        return { ...item, label: appNavCopy.transactionsStaff }
      }

      if (
        item.path === '/settlements' &&
        membership &&
        !canManageSettlements(membership, role)
      ) {
        return { ...item, label: appNavCopy.custodyStaff }
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
      title: appNavCopy.transactionsStaff,
      subtitle: 'راجع التحصيلات والاستردادات اللي سجلتها.',
    }
  }

  if (
    pathname === '/settlements' &&
    role &&
    !canManageSettlements(membership, role)
  ) {
    return {
      title: appNavCopy.custodyStaff,
      subtitle: 'المبلغ اللي لسه معاك دلوقتي.',
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
      title: 'تفاصيل الاستلام',
      subtitle: 'مراجعة المبلغ المستلم والعمليات المرتبطة',
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
    title: appNavCopy.home,
    subtitle: 'ملخص اليوم ومؤشرات التشغيل',
  }
}
