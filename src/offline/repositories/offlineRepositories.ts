import type { Booking } from '../../features/bookings/bookings.types'
import type { BookingSlot } from '../../features/schedule/scheduleApi.types'
import type { Transaction } from '../../features/transactions/transactions.types'
import type { SlotyLocalDatabase } from '../db/SlotyLocalDatabase'
import { slotyLocalDatabase } from '../db/SlotyLocalDatabase'
import type {
  BookingCacheRecord,
  BookingIntentStatus,
  BookingIntentRecord,
  OfflineContextInput,
  OfflineContextRecord,
  OfflineScope,
  ScheduleDayRecord,
  SyncMetadataRecord,
  TransactionCacheRecord,
} from '../offline.types'
import { OFFLINE_SCHEMA_VERSION } from '../offline.types'
import {
  createOfflineScopeKey,
  getScopedRecordIdentity,
} from '../scope/offlineScope'

function getCollectorId(transaction: Transaction): number | undefined {
  if (typeof transaction.created_by === 'number') {
    return transaction.created_by
  }

  return transaction.created_by?.id
}

function toBookingRecord(
  scope: OfflineScope,
  booking: Booking,
): BookingCacheRecord {
  return {
    ...getScopedRecordIdentity(scope),
    booking_id: booking.id,
    start_time: booking.start_time,
    status: booking.status,
    court_id: booking.court,
    customer_name: booking.customer_name ?? '',
    customer_phone: booking.customer_phone ?? '',
    booking,
  }
}

function toTransactionRecord(
  scope: OfflineScope,
  transaction: Transaction,
): TransactionCacheRecord {
  return {
    ...getScopedRecordIdentity(scope),
    transaction_id: transaction.id,
    created_at: transaction.created ?? transaction.modified ?? '',
    payment_method: transaction.payment_method,
    cancellation_state: transaction.is_cancelled ? 'cancelled' : 'active',
    settlement_state: transaction.is_settled ? 'settled' : 'unsettled',
    collector_id: getCollectorId(transaction),
    court_id: transaction.court ?? undefined,
    transaction,
  }
}

export interface ScheduleDaySnapshot {
  date: string
  message?: string | null
  slots: BookingSlot[]
}

export type BookingIntentInput = Omit<
  BookingIntentRecord,
  keyof ReturnType<typeof getScopedRecordIdentity>
>

export type BookingIntentUpdate = Partial<
  Pick<
    BookingIntentRecord,
    | 'court_id'
    | 'requested_date'
    | 'requested_start'
    | 'requested_end'
    | 'status'
    | 'last_checked_at'
    | 'resolved_booking_id'
  >
>

async function writeSyncMetadata(
  db: SlotyLocalDatabase,
  scope: OfflineScope,
  dataset: 'schedule' | 'bookings' | 'transactions',
  syncedAt: string,
): Promise<void> {
  const identity = getScopedRecordIdentity(scope)
  const existing = await db.sync_metadata.get(identity.scope_key)
  const record: SyncMetadataRecord = {
    ...identity,
    ...existing,
    schema_version: OFFLINE_SCHEMA_VERSION,
    updated_at: syncedAt,
    [`${dataset}_last_sync_at`]: syncedAt,
  }

  await db.sync_metadata.put(record)
}

/** Creates scoped local-cache operations around an injectable database. */
export function createOfflineRepositories(db: SlotyLocalDatabase) {
  return {
    getSyncMetadata(scope: OfflineScope): Promise<SyncMetadataRecord | undefined> {
      return db.sync_metadata.get(createOfflineScopeKey(scope))
    },

    async replaceScheduleDay(
      scope: OfflineScope,
      courtId: number,
      date: string,
      slots: BookingSlot[],
      syncedAt: string,
      message: string | null = null,
    ): Promise<void> {
      const identity = getScopedRecordIdentity(scope)
      const record: ScheduleDayRecord = {
        ...identity,
        court_id: courtId,
        date,
        message,
        slots,
        synced_at: syncedAt,
      }

      await db.transaction(
        'rw',
        db.schedule_days,
        db.sync_metadata,
        async () => {
          await db.schedule_days.delete([identity.scope_key, courtId, date])
          await db.schedule_days.bulkPut([record])
          await writeSyncMetadata(db, scope, 'schedule', syncedAt)
        },
      )
    },

    /**
     * Atomically replaces one Court's bounded Schedule window.
     *
     * Every day in `days` becomes a snapshot marker, including legitimate
     * backend-empty days. Dexie rolls back the deletion and metadata update if
     * any write in this transaction fails.
     */
    async replaceScheduleWindow(
      scope: OfflineScope,
      courtId: number,
      days: ScheduleDaySnapshot[],
      syncedAt: string,
    ): Promise<void> {
      const identity = getScopedRecordIdentity(scope)
      const dates = new Set(days.map((day) => day.date))
      const records: ScheduleDayRecord[] = days.map((day) => ({
        ...identity,
        court_id: courtId,
        date: day.date,
        message: day.message ?? null,
        slots: day.slots,
        synced_at: syncedAt,
      }))

      await db.transaction(
        'rw',
        db.schedule_days,
        db.sync_metadata,
        async () => {
          const existingCourtRows = await db.schedule_days
            .where('[scope_key+court_id]')
            .equals([identity.scope_key, courtId])
            .toArray()

          await Promise.all(
            existingCourtRows
              .filter((row) => dates.has(row.date))
              .map((row) =>
                db.schedule_days.delete([
                  row.scope_key,
                  row.court_id,
                  row.date,
                ]),
              ),
          )
          await db.schedule_days.bulkPut(records)
          await writeSyncMetadata(db, scope, 'schedule', syncedAt)
        },
      )
    },

    readScheduleDay(
      scope: OfflineScope,
      courtId: number,
      date: string,
    ): Promise<ScheduleDayRecord | undefined> {
      return db.schedule_days.get([createOfflineScopeKey(scope), courtId, date])
    },

    async replaceBookingsSnapshot(
      scope: OfflineScope,
      bookings: Booking[],
      syncedAt: string,
    ): Promise<void> {
      const scopeKey = createOfflineScopeKey(scope)
      const records = bookings.map((booking) => toBookingRecord(scope, booking))

      await db.transaction(
        'rw',
        db.bookings,
        db.sync_metadata,
        async () => {
          await db.bookings.where('scope_key').equals(scopeKey).delete()
          await db.bookings.bulkPut(records)
          await writeSyncMetadata(db, scope, 'bookings', syncedAt)
        },
      )
    },

    async readCachedBookings(scope: OfflineScope): Promise<Booking[]> {
      const rows = await db.bookings
        .where('scope_key')
        .equals(createOfflineScopeKey(scope))
        .toArray()

      return rows.map((row) => row.booking)
    },

    async saveBookingDetail(
      scope: OfflineScope,
      booking: Booking,
      cachedAt: string,
    ): Promise<void> {
      await db.booking_details.put({
        ...getScopedRecordIdentity(scope),
        booking_id: booking.id,
        booking,
        cached_at: cachedAt,
      })
    },

    async readBookingDetail(
      scope: OfflineScope,
      bookingId: number,
    ): Promise<Booking | undefined> {
      const row = await db.booking_details.get([
        createOfflineScopeKey(scope),
        bookingId,
      ])

      return row?.booking
    },

    async replaceTransactionsSnapshot(
      scope: OfflineScope,
      transactions: Transaction[],
      syncedAt: string,
    ): Promise<void> {
      const scopeKey = createOfflineScopeKey(scope)
      const records = transactions.map((transaction) =>
        toTransactionRecord(scope, transaction),
      )

      await db.transaction(
        'rw',
        db.transactions,
        db.sync_metadata,
        async () => {
          await db.transactions.where('scope_key').equals(scopeKey).delete()
          await db.transactions.bulkPut(records)
          await writeSyncMetadata(db, scope, 'transactions', syncedAt)
        },
      )
    },

    async readCachedTransactions(scope: OfflineScope): Promise<Transaction[]> {
      const rows = await db.transactions
        .where('scope_key')
        .equals(createOfflineScopeKey(scope))
        .toArray()

      return rows.map((row) => row.transaction)
    },

    async saveTransactionDetail(
      scope: OfflineScope,
      transaction: Transaction,
      cachedAt: string,
    ): Promise<void> {
      await db.transaction_details.put({
        ...getScopedRecordIdentity(scope),
        transaction_id: transaction.id,
        transaction,
        cached_at: cachedAt,
      })
    },

    async readTransactionDetail(
      scope: OfflineScope,
      transactionId: number,
    ): Promise<Transaction | undefined> {
      const row = await db.transaction_details.get([
        createOfflineScopeKey(scope),
        transactionId,
      ])

      return row?.transaction
    },

    async saveBookingIntent(
      scope: OfflineScope,
      intent: BookingIntentInput,
    ): Promise<void> {
      await db.booking_intents.put({
        ...getScopedRecordIdentity(scope),
        ...intent,
      })
    },

    getBookingIntents(
      scope: OfflineScope,
      courtId: number,
    ): Promise<BookingIntentRecord[]> {
      return db.booking_intents
        .where('[scope_key+court_id]')
        .equals([createOfflineScopeKey(scope), courtId])
        .toArray()
    },

    async getBookingIntent(
      scope: OfflineScope,
      localId: string,
    ): Promise<BookingIntentRecord | undefined> {
      return db.booking_intents.get([createOfflineScopeKey(scope), localId])
    },

    async getBookingIntentsForCourts(
      scope: OfflineScope,
      courtIds: number[],
    ): Promise<BookingIntentRecord[]> {
      const scopeKey = createOfflineScopeKey(scope)
      const uniqueCourtIds = [...new Set(courtIds)]
      const intentGroups = await Promise.all(
        uniqueCourtIds.map((courtId) =>
          db.booking_intents
            .where('[scope_key+court_id]')
            .equals([scopeKey, courtId])
            .toArray(),
        ),
      )

      return intentGroups.flat()
    },

    async updateBookingIntent(
      scope: OfflineScope,
      localId: string,
      updates: BookingIntentUpdate,
    ): Promise<BookingIntentRecord | undefined> {
      const scopeKey = createOfflineScopeKey(scope)
      const existing = await db.booking_intents.get([scopeKey, localId])

      if (!existing) {
        return undefined
      }

      const updatedIntent: BookingIntentRecord = {
        ...existing,
        ...updates,
      }

      await db.booking_intents.put(updatedIntent)

      return updatedIntent
    },

    async updateBookingIntentStatus(
      scope: OfflineScope,
      localId: string,
      status: BookingIntentStatus,
      options: {
        lastCheckedAt?: string | null
        resolvedBookingId?: number | null
      } = {},
    ): Promise<BookingIntentRecord | undefined> {
      const scopeKey = createOfflineScopeKey(scope)
      const existing = await db.booking_intents.get([scopeKey, localId])

      if (!existing) {
        return undefined
      }

      const updatedIntent: BookingIntentRecord = {
        ...existing,
        status,
        ...(Object.prototype.hasOwnProperty.call(options, 'lastCheckedAt')
          ? { last_checked_at: options.lastCheckedAt ?? null }
          : {}),
        ...(Object.prototype.hasOwnProperty.call(options, 'resolvedBookingId')
          ? { resolved_booking_id: options.resolvedBookingId ?? null }
          : {}),
      }

      await db.booking_intents.put(updatedIntent)

      return updatedIntent
    },

    async saveOfflineContext(input: OfflineContextInput): Promise<void> {
      const record: OfflineContextRecord = {
        ...getScopedRecordIdentity(input.scope),
        display_name: input.displayName,
        is_platform_admin: input.isPlatformAdmin,
        selected_club_slug: input.scope.clubSlug.trim(),
        membership_id: input.membership.id,
        role: input.membership.role,
        assigned_court_id: input.membership.court?.id ?? null,
        assigned_court_name: input.membership.court?.name ?? null,
        last_verified_at: input.lastVerifiedAt,
        schema_version: OFFLINE_SCHEMA_VERSION,
      }

      await db.offline_context.put(record)
    },

    readOfflineContext(
      scope: OfflineScope,
    ): Promise<OfflineContextRecord | undefined> {
      return db.offline_context.get(createOfflineScopeKey(scope))
    },

    async clearScope(scope: OfflineScope): Promise<void> {
      const scopeKey = createOfflineScopeKey(scope)

      await db.transaction('rw', db.tables, async () => {
        for (const table of db.tables) {
          await table.where('scope_key').equals(scopeKey).delete()
        }
      })
    },

    async clearUserOperationalData(userId: number): Promise<void> {
      if (!Number.isSafeInteger(userId) || userId <= 0) {
        throw new Error('Offline cleanup requires a positive user ID.')
      }

      await db.transaction('rw', db.tables, async () => {
        for (const table of db.tables) {
          await table.where('user_id').equals(userId).delete()
        }
      })
    },
  }
}

export const offlineRepositories = createOfflineRepositories(slotyLocalDatabase)
