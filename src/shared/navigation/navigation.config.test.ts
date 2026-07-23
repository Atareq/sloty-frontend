import { describe, expect, it } from 'vitest'
import {
  canRoleAccessPath,
  getPageHeaderMeta,
  getNavigationItemsForRole,
  navigationItems,
} from './navigation.config'

describe('navigation config', () => {
  it('filters staff navigation items by role', () => {
    const staffPaths = getNavigationItemsForRole('STAFF').map(
      (item) => item.path,
    )

    expect(staffPaths).toEqual([
      '/dashboard',
      '/schedule',
      '/bookings',
    ])
  })

  it('keeps owner-only routes out of staff navigation', () => {
    expect(canRoleAccessPath('STAFF', '/reports')).toBe(false)
    expect(canRoleAccessPath('OWNER', '/reports')).toBe(true)
    expect(canRoleAccessPath('STAFF', '/transactions')).toBe(false)
    expect(canRoleAccessPath('STAFF', '/settings/users')).toBe(false)
    expect(canRoleAccessPath('MANAGER', '/settings/users')).toBe(false)
    expect(canRoleAccessPath('OWNER', '/settings/users')).toBe(true)
  })

  it('returns only direct primary navigation items when requested', () => {
    const ownerPrimaryLabels = getNavigationItemsForRole('OWNER', {
      primaryOnly: true,
    }).map((item) => item.label)

    expect(ownerPrimaryLabels).toEqual([
      'لوحة التحكم',
      'الجدول',
      'سجل الحجوزات',
      'سجل المعاملات المالية',
      'التسويات المالية والجرد',
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
        'سجل المعاملات المالية',
        'التسويات المالية والجرد',
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
})
