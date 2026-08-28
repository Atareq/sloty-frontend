import { describe, expect, it } from 'vitest'
import { appRoutes } from './appRoutes'

describe('appRoutes', () => {
  it('exposes route constants for summary action links', () => {
    expect(appRoutes.home).toBe('/schedule')
    expect(appRoutes.dashboard).toBe('/dashboard')
    expect(appRoutes.bookings).toBe('/bookings')
    expect(appRoutes.transactions).toBe('/transactions')
    expect(appRoutes.settlementPreview).toBe('/settlements/preview')
    expect(appRoutes.settlementDetail(5)).toBe('/settlements/5')
    expect(appRoutes.settings).toBe('/settings')
    expect(appRoutes.settingsUsers).toBe('/settings/users')
    expect(appRoutes.auditLogs).toBe('/audit-logs')
  })
})
