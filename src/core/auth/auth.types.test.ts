import { describe, expect, it } from 'vitest'
import {
  canManageCancellationRefundPolicy,
  canManagePricing,
  canManageSettlements,
  canManageWorkingHours,
  canChooseOperationalCourt,
  canViewOwnSettlements,
  getAssignedOperationalCourtId,
  getDefaultRouteForRole,
  isOperationalRole,
} from './auth.types'

describe('isOperationalRole helper', () => {
  it('returns true for operational roles (ADMIN, OWNER, STAFF)', () => {
    expect(isOperationalRole('ADMIN')).toBe(true)
    expect(isOperationalRole('OWNER')).toBe(true)
    expect(isOperationalRole('STAFF')).toBe(true)
  })

  it('returns false for non-operational, unknown, or null roles', () => {
    expect(isOperationalRole('PLAYER')).toBe(false)
    expect(isOperationalRole(null)).toBe(false)
    expect(isOperationalRole(undefined)).toBe(false)
    expect(isOperationalRole('')).toBe(false)
    expect(isOperationalRole('SOMETHING_NEW')).toBe(false)
  })
})

describe('role permission helpers', () => {
  it('allows admins to manage pricing, working hours, and settlements', () => {
    expect(canManagePricing('ADMIN')).toBe(true)
    expect(canManageWorkingHours('ADMIN')).toBe(true)
    expect(canManageSettlements('ADMIN')).toBe(true)
    expect(canManageCancellationRefundPolicy('ADMIN')).toBe(true)
    expect(canViewOwnSettlements('ADMIN')).toBe(true)
  })

  it('allows owners to manage pricing, working hours, and settlements', () => {
    expect(canManagePricing('OWNER')).toBe(true)
    expect(canManageWorkingHours('OWNER')).toBe(true)
    expect(canManageSettlements('OWNER')).toBe(true)
    expect(canManageCancellationRefundPolicy('OWNER')).toBe(true)
    expect(canViewOwnSettlements('OWNER')).toBe(true)
  })

  it('blocks staff from management permissions but allows viewing own settlements', () => {
    expect(canManagePricing('STAFF')).toBe(false)
    expect(canManageWorkingHours('STAFF')).toBe(false)
    expect(canManageSettlements('STAFF')).toBe(false)
    expect(canManageCancellationRefundPolicy('STAFF')).toBe(false)
    expect(canViewOwnSettlements('STAFF')).toBe(true)
  })

  it('handles null roles safely', () => {
    expect(canManagePricing(null)).toBe(false)
    expect(canManageWorkingHours(null)).toBe(false)
    expect(canManageSettlements(null)).toBe(false)
    expect(canManageCancellationRefundPolicy(null)).toBe(false)
    expect(canViewOwnSettlements(null)).toBe(false)
  })

  it('resolves operational court choice and assigned court correctly', () => {
    const singleCourt = [{ id: 7, name: 'ملعب 1' }]
    const multiCourts = [
      { id: 7, name: 'ملعب 1' },
      { id: 8, name: 'ملعب 2' },
    ]

    // Staff with 1 court: cannot choose, assigned to that court
    expect(canChooseOperationalCourt('STAFF', singleCourt)).toBe(false)
    expect(getAssignedOperationalCourtId('STAFF', singleCourt)).toBe(7)

    // Staff with multiple courts: can choose, no single assigned court
    expect(canChooseOperationalCourt('STAFF', multiCourts)).toBe(true)
    expect(getAssignedOperationalCourtId('STAFF', multiCourts)).toBeNull()

    // Owner: can always choose, no single assigned court
    expect(canChooseOperationalCourt('OWNER', singleCourt)).toBe(true)
    expect(getAssignedOperationalCourtId('OWNER', singleCourt)).toBeNull()
    expect(canChooseOperationalCourt('OWNER', [])).toBe(true)
    expect(getAssignedOperationalCourtId('OWNER', [])).toBeNull()

    // Admin: can always choose, no single assigned court
    expect(canChooseOperationalCourt('ADMIN', [])).toBe(true)
    expect(getAssignedOperationalCourtId('ADMIN', [])).toBeNull()
  })

  it('maps default route per role', () => {
    expect(getDefaultRouteForRole('ADMIN')).toBe('/admin/clubs')
    expect(getDefaultRouteForRole('OWNER')).toBe('/schedule')
    expect(getDefaultRouteForRole('STAFF')).toBe('/schedule')
  })
})
