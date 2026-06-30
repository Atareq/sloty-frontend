import { describe, expect, it } from 'vitest'
import {
  canRoleAccessPath,
  getNavigationItemsForRole,
} from './navigation.config'

describe('navigation config', () => {
  it('filters staff navigation items by role', () => {
    const staffPaths = getNavigationItemsForRole('court_staff').map(
      (item) => item.path,
    )

    expect(staffPaths).toEqual(['/schedule', '/bookings', '/more'])
  })

  it('keeps owner-only routes out of staff navigation', () => {
    expect(canRoleAccessPath('court_staff', '/reports')).toBe(false)
    expect(canRoleAccessPath('club_owner', '/reports')).toBe(true)
  })

  it('can return the focused mobile menu for owners', () => {
    const ownerMobileLabels = getNavigationItemsForRole('club_owner', {
      mobileOnly: true,
    }).map((item) => item.label)

    expect(ownerMobileLabels).toEqual([
      'الجدول',
      'الحجوزات',
      'لوحة التحكم',
      'التسويات',
      'التقارير',
    ])
  })
})
