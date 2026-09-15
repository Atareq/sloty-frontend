import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { describe, expect, it } from 'vitest'
import { OFFLINE_SCHEMA_VERSION } from '../offline.types'
import { SlotyLocalDatabase } from './SlotyLocalDatabase'

describe('SlotyLocalDatabase schema & migrations', () => {
  it('opens at OFFLINE_SCHEMA_VERSION (version 5) with correct tables and keys', async () => {
    const dbName = `sloty-db-test-${crypto.randomUUID()}`
    const db = new SlotyLocalDatabase(dbName)
    await db.open()

    expect(db.verno).toBe(OFFLINE_SCHEMA_VERSION)
    expect(OFFLINE_SCHEMA_VERSION).toBe(5)

    const custodyTable = db.table('current_custody_snapshots')
    expect(custodyTable.schema.primKey.keyPath).toEqual([
      'scope_key',
      'snapshot_kind',
      'collector_scope',
    ])

    await db.close()
  })

  it('safely upgrades from v3 to v5 by dropping legacy court snapshots while preserving other stores', async () => {
    const dbName = `sloty-db-upgrade-${crypto.randomUUID()}`

    // 1. Simulate a legacy version 3 database with legacy court-scoped custody and booking intents
    const legacyDb = new Dexie(dbName)
    legacyDb.version(1).stores({
      sync_metadata: '&scope_key, user_id, club_slug',
      current_custody_snapshots:
        '&[scope_key+snapshot_kind+collector_scope+court_scope], scope_key, user_id, club_slug',
      booking_intents:
        '&[scope_key+local_id], scope_key, user_id, club_slug, [scope_key+court_id]',
    })
    legacyDb.version(3).stores({
      sync_metadata: '&scope_key, user_id, club_slug',
      current_custody_snapshots:
        '&[scope_key+snapshot_kind+collector_scope+court_scope], scope_key, user_id, club_slug',
      booking_intents:
        '&[scope_key+local_id], &[scope_key+client_request_id], scope_key, user_id, club_slug',
    })
    await legacyDb.open()

    // Seed legacy data
    await legacyDb.table('sync_metadata').put({
      scope_key: 'user:1:club:nasr-club',
      user_id: 1,
      club_slug: 'nasr-club',
      operational_last_sync_at: '2026-09-01T10:00:00Z',
    })

    await legacyDb.table('current_custody_snapshots').put({
      scope_key: 'user:1:club:nasr-club',
      user_id: 1,
      club_slug: 'nasr-club',
      snapshot_kind: 'preview',
      collector_scope: 'self',
      court_scope: 'court:7',
      payload: { net_amount: '900.00' },
      synced_at: '2026-09-01T10:00:00Z',
    })

    await legacyDb.table('booking_intents').put({
      scope_key: 'user:1:club:nasr-club',
      user_id: 1,
      club_slug: 'nasr-club',
      local_id: 'intent-123',
      client_request_id: 'req-456',
      court_id: 7,
      customer_name: 'أحمد',
      customer_phone: '01012345678',
      requested_date: '2026-09-15',
      requested_start: '18:00',
      requested_end: '19:00',
      status: 'PENDING_SYNC',
      requested_recurring: false,
      created_at: '2026-09-01T10:00:00Z',
      updated_at: '2026-09-01T10:00:00Z',
      review_reason: null,
      resolved_booking_id: null,
      notes: null,
      original_slot_snapshot: {
        court_id: 7,
        court_name: 'ملعب 1',
        date: '2026-09-15',
        start_time: '18:00',
        end_time: '19:00',
        duration_minutes: 60,
        status: 'FREE',
        formatted_time: '6:00 م',
        day_label: 'الثلاثاء',
        price: '200.00',
        requires_digital_payment_reference: false,
        internal_hold_expiry_hours: 12,
      },
    })
    await legacyDb.close()

    // 2. Open with the new SlotyLocalDatabase (v5)
    const upgradedDb = new SlotyLocalDatabase(dbName)
    await upgradedDb.open()

    expect(upgradedDb.verno).toBe(5)

    // Other stores preserved
    const metadata = await upgradedDb.sync_metadata.get('user:1:club:nasr-club')
    expect(metadata?.operational_last_sync_at).toBe('2026-09-01T10:00:00Z')

    const intent = await upgradedDb.booking_intents.get([
      'user:1:club:nasr-club',
      'intent-123',
    ])
    expect(intent?.customer_name).toBe('أحمد')

    // Legacy court-scoped custody table was safely dropped and recreated empty
    const custodyRecords = await upgradedDb.current_custody_snapshots.toArray()
    expect(custodyRecords).toHaveLength(0)

    // Can store new snapshot under unified club+collector key
    await upgradedDb.current_custody_snapshots.put({
      scope_key: 'user:1:club:nasr-club',
      user_id: 1,
      club_slug: 'nasr-club',
      snapshot_kind: 'preview',
      collector_scope: 'self',
      collector_id: 1,
      payload: { net_amount: '1500.00' } as never,
      synced_at: '2026-09-11T12:00:00Z',
    })

    const newSnapshot = await upgradedDb.current_custody_snapshots.get([
      'user:1:club:nasr-club',
      'preview',
      'self',
    ])
    expect(newSnapshot?.collector_scope).toBe('self')
    expect(newSnapshot?.payload).toEqual({ net_amount: '1500.00' })

    await upgradedDb.close()
  })
})
