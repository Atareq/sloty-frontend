import Dexie, { type EntityTable, type Table } from 'dexie'
import type {
  BookingCacheRecord,
  BookingDetailRecord,
  BookingRequestRecord,
  CurrentCustodySnapshotKind,
  CurrentCustodySnapshotRecord,
  OfflineContextRecord,
  ScheduleDayRecord,
  SyncMetadataRecord,
  TransactionCacheRecord,
  TransactionDetailRecord,
} from '../offline.types'
import { OFFLINE_SCHEMA_VERSION } from '../offline.types'
import { normalizeBookingRequestRecord } from '../bookings/bookingRequestPersistence'

export const OFFLINE_DATABASE_NAME = 'sloty_local_db'

/**
 * Sloty's structured, versioned local cache.
 *
 * Only indexed fields are declared below. Backend snapshots remain intact in
 * their non-indexed payload properties.
 */
export class SlotyLocalDatabase extends Dexie {
  sync_metadata!: EntityTable<SyncMetadataRecord, 'scope_key'>
  schedule_days!: Table<ScheduleDayRecord, [string, number, string]>
  bookings!: Table<BookingCacheRecord, [string, number]>
  booking_details!: Table<BookingDetailRecord, [string, number]>
  transactions!: Table<TransactionCacheRecord, [string, number]>
  transaction_details!: Table<TransactionDetailRecord, [string, number]>
  current_custody_snapshots!: Table<
    CurrentCustodySnapshotRecord,
    [string, CurrentCustodySnapshotKind, string, string]
  >
  booking_intents!: Table<BookingRequestRecord, [string, string]>
  offline_context!: EntityTable<OfflineContextRecord, 'scope_key'>

  constructor(databaseName = OFFLINE_DATABASE_NAME) {
    super(databaseName)

    this.version(1).stores({
      sync_metadata: '&scope_key, user_id, club_slug',
      schedule_days:
        '&[scope_key+court_id+date], scope_key, user_id, club_slug, [scope_key+court_id], [scope_key+date]',
      bookings:
        '&[scope_key+booking_id], scope_key, user_id, club_slug, [scope_key+start_time], [scope_key+status], [scope_key+court_id], [scope_key+customer_name], [scope_key+customer_phone]',
      booking_details:
        '&[scope_key+booking_id], scope_key, user_id, club_slug',
      transactions:
        '&[scope_key+transaction_id], scope_key, user_id, club_slug, [scope_key+created_at], [scope_key+payment_method], [scope_key+cancellation_state], [scope_key+settlement_state], [scope_key+collector_id], [scope_key+court_id]',
      transaction_details:
        '&[scope_key+transaction_id], scope_key, user_id, club_slug',
      booking_intents:
        '&[scope_key+local_id], scope_key, user_id, club_slug, [scope_key+court_id], [scope_key+status], [scope_key+created_at]',
      offline_context: '&scope_key, user_id, club_slug, last_verified_at',
    })

    this.version(2).stores({
      sync_metadata: '&scope_key, user_id, club_slug',
      schedule_days:
        '&[scope_key+court_id+date], scope_key, user_id, club_slug, [scope_key+court_id], [scope_key+date]',
      bookings:
        '&[scope_key+booking_id], scope_key, user_id, club_slug, [scope_key+start_time], [scope_key+status], [scope_key+court_id], [scope_key+customer_name], [scope_key+customer_phone]',
      booking_details:
        '&[scope_key+booking_id], scope_key, user_id, club_slug',
      transactions:
        '&[scope_key+transaction_id], scope_key, user_id, club_slug, [scope_key+created_at], [scope_key+payment_method], [scope_key+cancellation_state], [scope_key+settlement_state], [scope_key+collector_id], [scope_key+court_id]',
      transaction_details:
        '&[scope_key+transaction_id], scope_key, user_id, club_slug',
      current_custody_snapshots:
        '&[scope_key+snapshot_kind+collector_scope+court_scope], scope_key, user_id, club_slug, [scope_key+snapshot_kind], [scope_key+collector_scope], [scope_key+court_scope], synced_at',
      booking_intents:
        '&[scope_key+local_id], scope_key, user_id, club_slug, [scope_key+court_id], [scope_key+status], [scope_key+created_at]',
      offline_context: '&scope_key, user_id, club_slug, last_verified_at',
    })

    this.version(OFFLINE_SCHEMA_VERSION).stores({
      sync_metadata: '&scope_key, user_id, club_slug',
      schedule_days:
        '&[scope_key+court_id+date], scope_key, user_id, club_slug, [scope_key+court_id], [scope_key+date]',
      bookings:
        '&[scope_key+booking_id], scope_key, user_id, club_slug, [scope_key+start_time], [scope_key+status], [scope_key+court_id], [scope_key+customer_name], [scope_key+customer_phone]',
      booking_details:
        '&[scope_key+booking_id], scope_key, user_id, club_slug',
      transactions:
        '&[scope_key+transaction_id], scope_key, user_id, club_slug, [scope_key+created_at], [scope_key+payment_method], [scope_key+cancellation_state], [scope_key+settlement_state], [scope_key+collector_id], [scope_key+court_id]',
      transaction_details:
        '&[scope_key+transaction_id], scope_key, user_id, club_slug',
      current_custody_snapshots:
        '&[scope_key+snapshot_kind+collector_scope+court_scope], scope_key, user_id, club_slug, [scope_key+snapshot_kind], [scope_key+collector_scope], [scope_key+court_scope], synced_at',
      booking_intents:
        '&[scope_key+local_id], &[scope_key+client_request_id], scope_key, user_id, club_slug, [scope_key+court_id], [scope_key+status], [scope_key+created_at]',
      offline_context: '&scope_key, user_id, club_slug, last_verified_at',
    }).upgrade((transaction) =>
      transaction
        .table('booking_intents')
        .toCollection()
        .modify((record) => {
          Object.assign(record, normalizeBookingRequestRecord(record))
          delete record.last_checked_at
        }),
    )
  }
}

export const slotyLocalDatabase = new SlotyLocalDatabase()
