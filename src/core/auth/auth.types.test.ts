import { describe, expect, it } from 'vitest'
import { getDefaultRouteForRole } from './auth.types'

describe('getDefaultRouteForRole', () => {
  it('maps roles to their frontend landing routes', () => {
    expect(getDefaultRouteForRole('PLATFORM_ADMIN')).toBe('/admin/clubs')
    expect(getDefaultRouteForRole('OWNER')).toBe('/dashboard')
    expect(getDefaultRouteForRole('MANAGER')).toBe('/dashboard')
    expect(getDefaultRouteForRole('STAFF')).toBe('/dashboard')
  })
})
