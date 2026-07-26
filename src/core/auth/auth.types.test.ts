import { describe, expect, it } from 'vitest'
import {
  canManagePricing,
  canManageSettlements,
  canManageWorkingHours,
  getActiveMembershipPermissions,
  resolveMembershipPermissions,
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
  it('defaults membership permissions to false', () => {
    expect(resolveMembershipPermissions(null)).toEqual({
      can_change_pricing: false,
      can_manage_working_hours: false,
      can_manage_settlements: false,
    })
  })

  it('allows platform admins to manage pricing, working hours, and settlements', () => {
    expect(getActiveMembershipPermissions('PLATFORM_ADMIN', null)).toEqual({
      can_change_pricing: true,
      can_manage_working_hours: true,
      can_manage_settlements: true,
    })
  })

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

  it('uses nested membership permissions before legacy top-level fields', () => {
    const manager = membership('MANAGER', {
      permissions: {
        can_change_pricing: false,
        can_manage_working_hours: true,
        can_manage_settlements: false,
      },
      can_change_pricing: true,
      can_manage_working_hours: false,
      can_manage_settlements: true,
    })

    expect(resolveMembershipPermissions(manager)).toEqual({
      can_change_pricing: false,
      can_manage_working_hours: true,
      can_manage_settlements: false,
    })
  })

  it('supports legacy top-level effective permission fields centrally', () => {
    const manager = membership('MANAGER', {
      can_change_pricing: true,
      can_manage_working_hours: false,
      can_manage_settlements: true,
    })

    expect(resolveMembershipPermissions(manager)).toEqual({
      can_change_pricing: true,
      can_manage_working_hours: false,
      can_manage_settlements: true,
    })
  })

  it('supports raw manager permission fields only for managers', () => {
    const manager = membership('MANAGER', {
      manager_can_change_pricing: true,
      manager_can_settle_transactions: true,
    })
    const staff = membership('STAFF', {
      manager_can_change_pricing: true,
      manager_can_settle_transactions: true,
    })

    expect(resolveMembershipPermissions(manager)).toEqual({
      can_change_pricing: true,
      can_manage_working_hours: true,
      can_manage_settlements: true,
    })
    expect(resolveMembershipPermissions(staff)).toEqual({
      can_change_pricing: false,
      can_manage_working_hours: false,
      can_manage_settlements: false,
    })
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
