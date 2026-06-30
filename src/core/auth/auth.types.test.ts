import { describe, expect, it } from 'vitest'
import { getDefaultRouteForRole } from './auth.types'

describe('getDefaultRouteForRole', () => {
  it('maps roles to their frontend landing routes', () => {
    expect(getDefaultRouteForRole('platform_super_admin')).toBe('/admin/clubs')
    expect(getDefaultRouteForRole('club_owner')).toBe('/dashboard')
    expect(getDefaultRouteForRole('club_manager')).toBe('/schedule')
    expect(getDefaultRouteForRole('court_staff')).toBe('/schedule')
  })
})
