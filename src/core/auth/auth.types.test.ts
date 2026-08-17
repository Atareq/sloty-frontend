import { describe, expect, it } from 'vitest'
import {
  canManageCancellationRefundPolicy,
  canManagePricing,
  canManageSettlements,
  canManageWorkingHours,
  canChooseOperationalCourt,
  canViewOwnSettlements,
  getAssignedOperationalCourtId,
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

  it('keeps cancellation refund policy limited to platform admins and owners', () => {
    const owner = membership('OWNER')
    const manager = membership('MANAGER', {
      can_change_pricing: true,
      can_manage_working_hours: true,
      can_manage_settlements: true,
    })
    const staff = membership('STAFF')

    expect(canManageCancellationRefundPolicy(null, 'PLATFORM_ADMIN')).toBe(true)
    expect(canManageCancellationRefundPolicy(owner)).toBe(true)
    expect(canManageCancellationRefundPolicy(manager)).toBe(false)
    expect(canManageCancellationRefundPolicy(staff)).toBe(false)
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

  it('splits own settlement visibility from settlement management', () => {
    const staff = membership('STAFF')
    const restrictedManager = membership('MANAGER', {
      can_manage_settlements: false,
    })
    const authorizedManager = membership('MANAGER', {
      can_manage_settlements: true,
    })
    const owner = membership('OWNER')

    expect(canViewOwnSettlements(staff)).toBe(true)
    expect(canViewOwnSettlements(restrictedManager)).toBe(true)
    expect(canManageSettlements(staff)).toBe(false)
    expect(canManageSettlements(restrictedManager)).toBe(false)
    expect(canManageSettlements(authorizedManager)).toBe(true)
    expect(canManageSettlements(owner)).toBe(true)
  })

  it('resolves staff operational court from selected membership only', () => {
    const staff = membership('STAFF', {
      court: {
        id: 7,
        name: 'ملعب 1',
      },
    })
    const owner = membership('OWNER')

    expect(getAssignedOperationalCourtId('STAFF', staff)).toBe(7)
    expect(canChooseOperationalCourt('STAFF', staff)).toBe(false)
    expect(getAssignedOperationalCourtId('OWNER', owner)).toBeNull()
    expect(canChooseOperationalCourt('OWNER', owner)).toBe(true)
  })
})
