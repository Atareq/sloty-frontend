import { describe, expect, it } from 'vitest'
import { isPwaPromptBlockedRoute } from './pwaReloadSafety'

describe('PWA prompt route safety', () => {
  it('blocks full-page editors that do not expose shared dirty state', () => {
    expect(isPwaPromptBlockedRoute('/admin/clubs/new')).toBe(true)
    expect(isPwaPromptBlockedRoute('/admin/clubs/12')).toBe(true)
    expect(
      isPwaPromptBlockedRoute('/admin/clubs/nasr/courts/new'),
    ).toBe(true)
    expect(
      isPwaPromptBlockedRoute('/admin/clubs/nasr/courts/7'),
    ).toBe(true)
    expect(isPwaPromptBlockedRoute('/admin/users/new')).toBe(true)
    expect(isPwaPromptBlockedRoute('/settings/courts/7')).toBe(true)
  })

  it('allows read-only and operational routes once sheets are closed', () => {
    expect(isPwaPromptBlockedRoute('/schedule')).toBe(false)
    expect(isPwaPromptBlockedRoute('/bookings')).toBe(false)
    expect(isPwaPromptBlockedRoute('/admin/clubs')).toBe(false)
    expect(isPwaPromptBlockedRoute('/admin/clubs/nasr/courts')).toBe(false)
    expect(isPwaPromptBlockedRoute('/settings/courts')).toBe(false)
  })
})
