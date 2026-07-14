import { describe, expect, it } from 'vitest'
import {
  canRoleAccessPath,
  getNavigationItemsForRole,
} from './navigation.config'

describe('navigation config', () => {
  it('filters staff navigation items by role', () => {
    const staffPaths = getNavigationItemsForRole('STAFF').map(
      (item) => item.path,
    )

    expect(staffPaths).toEqual([
      '/schedule',
      '/bookings',
      '/transactions',
      '/more',
    ])
  })

  it('keeps owner-only routes out of staff navigation', () => {
    expect(canRoleAccessPath('STAFF', '/reports')).toBe(false)
    expect(canRoleAccessPath('OWNER', '/reports')).toBe(true)
    expect(canRoleAccessPath('STAFF', '/transactions')).toBe(true)
  })

  it('can return the focused mobile menu for owners', () => {
    const ownerMobileLabels = getNavigationItemsForRole('OWNER', {
      mobileOnly: true,
    }).map((item) => item.label)

    expect(ownerMobileLabels).toEqual([
      'الجدول',
      'الحجوزات',
      'المعاملات',
      'لوحة التحكم',
      'التسويات',
      'التقارير',
    ])
  })
})
