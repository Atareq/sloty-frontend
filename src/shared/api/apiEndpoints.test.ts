import { describe, expect, it } from 'vitest'
import { apiEndpoints } from './apiEndpoints'

describe('apiEndpoints', () => {
  it('builds club nested booking URLs', () => {
    expect(apiEndpoints.clubs.bookings.list('nasr-club')).toBe(
      'clubs/nasr-club/bookings/',
    )
    expect(apiEndpoints.clubs.bookings.slots('nasr-club')).toBe(
      'clubs/nasr-club/bookings/slots/',
    )
    expect(apiEndpoints.clubs.bookings.detail('nasr-club', 12)).toBe(
      'clubs/nasr-club/bookings/12/',
    )
    expect(apiEndpoints.clubs.bookings.cancellationPreview('nasr-club', 12)).toBe(
      'clubs/nasr-club/bookings/12/cancellation-preview/',
    )
    expect(apiEndpoints.clubs.bookings.noShow('nasr-club', 'bk-9')).toBe(
      'clubs/nasr-club/bookings/bk-9/no-show/',
    )
  })

  it('builds core resource detail URLs', () => {
    expect(apiEndpoints.egyptLocations).toBe('egypt-locations/')
    expect(apiEndpoints.clubs.detail(4)).toBe('clubs/4/')
    expect(apiEndpoints.clubs.courts.detail('nasr-club', 3)).toBe(
      'clubs/nasr-club/courts/3/',
    )
    expect(apiEndpoints.clubs.users.list('nasr-club')).toBe(
      'clubs/nasr-club/users/',
    )
    expect(apiEndpoints.clubs.auditLogs.detail('nasr-club', 52)).toBe(
      'clubs/nasr-club/audit-logs/52/',
    )
    expect(apiEndpoints.clubs.settlements.markSettled('nasr-club', 9)).toBe(
      'clubs/nasr-club/settlements/9/mark-settled/',
    )
    expect(apiEndpoints.clubs.settlements.unsettledSummary('nasr-club')).toBe(
      'clubs/nasr-club/settlements/unsettled-summary/',
    )
    expect(apiEndpoints.clubs.reports.courtUsage('nasr-club')).toBe(
      'clubs/nasr-club/reports/court-usage/',
    )
    expect(apiEndpoints.users.detail('staff-1')).toBe('users/staff-1/')
  })
})
