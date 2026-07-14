import { describe, expect, it } from 'vitest'
import { apiEndpoints } from './apiEndpoints'

describe('apiEndpoints', () => {
  it('builds club nested booking URLs', () => {
    expect(apiEndpoints.clubs.bookings.list('nasr-club')).toBe(
      'clubs/nasr-club/bookings/',
    )
    expect(apiEndpoints.clubs.bookings.detail('nasr-club', 12)).toBe(
      'clubs/nasr-club/bookings/12/',
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
    expect(apiEndpoints.users.detail('staff-1')).toBe('users/staff-1/')
  })
})
