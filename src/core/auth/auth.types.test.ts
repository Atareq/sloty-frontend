import { describe, expect, it } from 'vitest'
import {
  canManagePricing,
  canManageSettlements,
  canManageWorkingHours,
  type CurrentUserMembership,
} from './auth.types'

function membership(
  role: CurrentUserMembership['role'],
  flags: Partial<CurrentUserMembership> = {},
): CurrentUserMembership {
  return {
    id: 1,
    role,
    club: {
      id: 1,
      slug: 'nasr-club',
      name: 'نادي النصر',
      is_active: true,
    },
    court: null,
    ...flags,
  }
}

describe('membership permission helpers', () => {
  it('allows owners to manage pricing, working hours, and settlements', () => {
    const owner = membership('OWNER')

    expect(canManagePricing(owner)).toBe(true)
    expect(canManageWorkingHours(owner)).toBe(true)
    expect(canManageSettlements(owner)).toBe(true)
  })

  it('allows managers based on membership flags', () => {
    const manager = membership('MANAGER', {
      can_change_pricing: true,
      can_manage_working_hours: false,
      can_manage_settlements: true,
    })

    expect(canManagePricing(manager)).toBe(true)
    expect(canManageWorkingHours(manager)).toBe(false)
    expect(canManageSettlements(manager)).toBe(true)
  })

  it('blocks staff from management permissions', () => {
    const staff = membership('STAFF', {
      can_change_pricing: true,
      can_manage_working_hours: true,
      can_manage_settlements: true,
    })

    expect(canManagePricing(staff)).toBe(false)
    expect(canManageWorkingHours(staff)).toBe(false)
    expect(canManageSettlements(staff)).toBe(false)
  })
})
