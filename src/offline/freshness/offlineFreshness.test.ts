import { describe, expect, it } from 'vitest'
import type { SyncMetadataRecord } from '../offline.types'
import {
  OFFLINE_CREATION_RESTRICTED_TEXT,
  OFFLINE_STALE_WARNING_TEXT,
  canCreateOfflineRequest,
  classifyOfflineFreshness,
  getOperationalFreshnessTimestamp,
} from './offlineFreshness'

const now = new Date('2026-09-04T12:00:00.000Z')

function hoursAgo(hours: number): string {
  return new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString()
}

describe('offline freshness policy', () => {
  it('keeps less-than-12-hour data fresh and allows new local requests', () => {
    const freshness = classifyOfflineFreshness(hoursAgo(11.99), now)

    expect(freshness.level).toBe('fresh')
    expect(freshness.warningText).toBeNull()
    expect(freshness.canCreateNewOfflineRequest).toBe(true)
  })

  it('starts the warning state exactly at 12 hours without blocking requests', () => {
    const freshness = classifyOfflineFreshness(hoursAgo(12), now)

    expect(freshness.level).toBe('stale_warning')
    expect(freshness.warningText).toBe(OFFLINE_STALE_WARNING_TEXT)
    expect(freshness.canCreateNewOfflineRequest).toBe(true)
  })

  it('keeps 12-to-72-hour data usable with a warning', () => {
    const freshness = classifyOfflineFreshness(hoursAgo(30), now)

    expect(freshness.level).toBe('stale_warning')
    expect(freshness.canCreateNewOfflineRequest).toBe(true)
  })

  it('keeps exactly 72 hours in the warning state', () => {
    const freshness = classifyOfflineFreshness(hoursAgo(72), now)

    expect(freshness.level).toBe('stale_warning')
    expect(freshness.canCreateNewOfflineRequest).toBe(true)
  })

  it('restricts only new local offline request creation after more than 72 hours', () => {
    const freshness = classifyOfflineFreshness(hoursAgo(72.01), now)

    expect(freshness.level).toBe('creation_restricted')
    expect(freshness.warningText).toBe(OFFLINE_CREATION_RESTRICTED_TEXT)
    expect(freshness.canCreateNewOfflineRequest).toBe(false)
    expect(canCreateOfflineRequest(freshness, true)).toBe(false)
  })

  it('does not block online Booking creation because of cache age', () => {
    const freshness = classifyOfflineFreshness(hoursAgo(100), now)

    expect(canCreateOfflineRequest(freshness, false)).toBe(true)
  })

  it('does not classify historical appointment time as freshness expiration', () => {
    const freshness = classifyOfflineFreshness(hoursAgo(1), now)

    expect(freshness.level).toBe('fresh')
    expect(freshness.canCreateNewOfflineRequest).toBe(true)
  })

  it('falls back to the newest scoped dataset timestamp for existing metadata', () => {
    const metadata: SyncMetadataRecord = {
      scope_key: 'user:1:club:club-a',
      user_id: 1,
      club_slug: 'club-a',
      schedule_last_sync_at: hoursAgo(8),
      bookings_last_sync_at: hoursAgo(10),
      transactions_last_sync_at: hoursAgo(9),
      current_custody_last_sync_at: hoursAgo(11),
      schema_version: 2,
      updated_at: hoursAgo(8),
    }

    expect(getOperationalFreshnessTimestamp(metadata)).toBe(hoursAgo(8))
  })
})
