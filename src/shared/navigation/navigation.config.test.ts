import { describe, expect, it } from 'vitest'
import {
  canRoleAccessPath,
  getPageHeaderMeta,
  getNavigationItemsForRole,
  navigationItems,
} from './navigation.config'

describe('navigation config', () => {
  const membership = {
    id: 10,
    role: 'MANAGER' as const,
    club: {
      id: 1,
      slug: 'demo-club',
      name: 'نادي التجربة',
      is_active: true,
    },
    court: null,
    permissions: {
      can_change_pricing: false,
      can_manage_working_hours: false,
      can_manage_settlements: false,
    },
  }

  it('filters staff navigation items by role', () => {
    const staffPaths = getNavigationItemsForRole('STAFF').map(
      (item) => item.path,
    )

    expect(staffPaths).toEqual([
      '/dashboard',
      '/schedule',
      '/bookings',
      '/transactions',
      '/settlements',
    ])
  })

  it('keeps owner-only routes out of staff navigation', () => {
    expect(canRoleAccessPath('STAFF', '/reports')).toBe(false)
    expect(canRoleAccessPath('OWNER', '/reports')).toBe(true)
    expect(canRoleAccessPath('MANAGER', '/reports')).toBe(true)
    expect(canRoleAccessPath('STAFF', '/transactions')).toBe(true)
    expect(canRoleAccessPath('STAFF', '/settlements')).toBe(true)
    expect(canRoleAccessPath('STAFF', '/settings/users')).toBe(false)
    expect(canRoleAccessPath('MANAGER', '/settings/users')).toBe(false)
    expect(canRoleAccessPath('OWNER', '/settings/users')).toBe(true)
  })

  it('uses role and effective settlement permission for finance labels', () => {
    expect(
      getNavigationItemsForRole('STAFF', {}, { ...membership, role: 'STAFF' })
        .find((item) => item.path === '/transactions')?.label,
    ).toBe('تحصيلاتي')
    expect(
      getNavigationItemsForRole('MANAGER', {}, membership)
        .find((item) => item.path === '/settlements')?.label,
    ).toBe('عهدتي')
    expect(
      getNavigationItemsForRole('MANAGER', {}, {
        ...membership,
        permissions: {
          ...membership.permissions,
          can_manage_settlements: true,
        },
      }).find((item) => item.path === '/settlements')?.label,
    ).toBe('عهد الموظفين')
    expect(getPageHeaderMeta('/transactions', 'STAFF', membership).title)
      .toBe('تحصيلاتي')
  })

  it('returns only direct primary navigation items when requested', () => {
    const ownerPrimaryLabels = getNavigationItemsForRole('OWNER', {
      primaryOnly: true,
    }).map((item) => item.label)

    expect(ownerPrimaryLabels).toEqual([
      'لوحة التحكم',
      'الجدول',
      'سجل الحجوزات',
      'التحصيلات',
      'عهد الموظفين',
      'التقارير الاستهلاكية للملاعب',
      'الإعدادات',
    ])
    expect(ownerPrimaryLabels).not.toEqual(
      expect.arrayContaining([
        'إعدادات الملاعب',
        'المستخدمون والصلاحيات',
        'سجل النشاطات',
      ]),
    )
  })

  it('can return the three daily mobile footer items for each club role', () => {
    const expectedMobileLabels = [
      'لوحة التحكم',
      'الجدول',
      'سجل الحجوزات',
    ]
    const ownerMobileLabels = getNavigationItemsForRole('OWNER', {
      mobileOnly: true,
    }).map((item) => item.label)
    const managerMobileLabels = getNavigationItemsForRole('MANAGER', {
      mobileOnly: true,
    }).map((item) => item.label)
    const staffMobileLabels = getNavigationItemsForRole('STAFF', {
      mobileOnly: true,
    }).map((item) => item.label)

    expect(ownerMobileLabels).toEqual(expectedMobileLabels)
    expect(managerMobileLabels).toEqual(expectedMobileLabels)
    expect(staffMobileLabels).toEqual(expectedMobileLabels)
  })

  it('keeps finance, admin, history, and settings pages out of the footer', () => {
    const hiddenMobilePaths = [
      '/transactions',
      '/settlements',
      '/reports',
      '/audit-logs',
      '/settings/courts',
      '/settings',
      '/settings/users',
      '/admin/clubs',
      '/admin/users',
      '/admin/settings',
    ]

    for (const path of hiddenMobilePaths) {
      expect(navigationItems.find((item) => item.path === path)?.showInMobile)
        .toBe(false)
    }
  })

  it('keeps settings detail pages and audit log out of primary navigation', () => {
    const hiddenPrimaryPaths = [
      '/audit-logs',
      '/settings/courts',
      '/settings/users',
      '/admin/settings',
    ]

    for (const path of hiddenPrimaryPaths) {
      expect(
        navigationItems.find((item) => item.path === path)?.showInPrimaryNav,
      ).toBe(false)
    }
  })

  it('uses the approved Arabic labels', () => {
    const labels = navigationItems.map((item) => item.label)

    expect(labels).toEqual(
      expect.arrayContaining([
        'لوحة التحكم',
        'الجدول',
        'سجل الحجوزات',
        'التحصيلات',
        'عهد الموظفين',
        'سجل النشاطات',
        'التقارير الاستهلاكية للملاعب',
        'الإعدادات',
        'المستخدمون والصلاحيات',
      ]),
    )
    expect(labels).not.toEqual(
      expect.arrayContaining([
        'الحجوزات',
        'المعاملات',
        'التسويات',
        'التقارير',
        'سجل النشاط',
        'سحل النشاطات',
        'الجدويل',
        'لوحع التحكم',
        'المزيد',
      ]),
    )
  })

  it('exposes settings users page metadata', () => {
    expect(getPageHeaderMeta('/settings/users')).toEqual({
      title: 'المستخدمون والصلاحيات',
      subtitle: 'مراجعة أعضاء النادي وصلاحيات المديرين',
    })
  })

  it('exposes intentional metadata for every authenticated router route shape', () => {
    const routeSamples = [
      '/dashboard',
      '/schedule',
      '/bookings',
      '/transactions',
      '/settlements',
      '/settlements/history',
      '/settlements/preview',
      '/settlements/42',
      '/reports',
      '/audit-logs',
      '/settings/courts',
      '/settings/courts/5',
      '/settings',
      '/settings/users',
      '/more',
      '/admin/clubs',
      '/admin/clubs/new',
      '/admin/clubs/demo-club',
      '/admin/clubs/demo-club/courts',
      '/admin/clubs/demo-club/courts/new',
      '/admin/clubs/demo-club/courts/3',
      '/admin/users',
      '/admin/users/new',
      '/admin/users/9',
      '/admin/settings',
    ]

    for (const path of routeSamples) {
      expect(getPageHeaderMeta(path), path).not.toEqual({
        title: 'لوحة التحكم',
        subtitle: 'ملخص اليوم ومؤشرات التشغيل',
      })
      expect(getPageHeaderMeta(path).title).not.toHaveLength(0)
    }
  })

  it('uses feature-approved wording for migrated header routes', () => {
    expect(getPageHeaderMeta('/admin/clubs/new')).toEqual({
      title: 'إضافة نادي',
      subtitle: 'بيانات النادي الأساسية',
    })
    expect(getPageHeaderMeta('/admin/clubs/demo-club/courts/new')).toEqual({
      title: 'إضافة ملعب',
      subtitle: 'بيانات الملعب الأساسية التي يعتمد عليها جدول الحجز لاحقًا',
    })
    expect(getPageHeaderMeta('/admin/users/new')).toEqual({
      title: 'إضافة مستخدم',
      subtitle: 'استخدم نفس عقد إنشاء الحسابات والعضويات المعتمد في الواجهة',
    })
  })
})
