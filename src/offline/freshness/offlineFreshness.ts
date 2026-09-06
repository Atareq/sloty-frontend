import type { SyncMetadataRecord } from '../offline.types'

export const OFFLINE_FRESHNESS_WARNING_THRESHOLD_MS = 12 * 60 * 60 * 1000
export const OFFLINE_FRESHNESS_RESTRICT_THRESHOLD_MS = 72 * 60 * 60 * 1000

export type OfflineFreshnessLevel =
  | 'unknown'
  | 'fresh'
  | 'stale_warning'
  | 'creation_restricted'

export interface OfflineFreshnessState {
  ageMs: number | null
  canCreateNewOfflineRequest: boolean
  lastSuccessfulOperationalSyncAt: string | null
  level: OfflineFreshnessLevel
  warningText: string | null
}

export const OFFLINE_STALE_WARNING_TEXT =
  'البيانات المحفوظة بقالها أكتر من 12 ساعة.\nاتصل بالإنترنت علشان تحدّث Sloty.'

export const OFFLINE_CREATION_RESTRICTED_TEXT =
  'آخر اتصال بـ Sloty كان من أكتر من 3 أيام.\nتقدر تشوف البيانات المحفوظة، لكن لازم تتصل بالإنترنت قبل تسجيل طلبات حجز جديدة.'

const datasetTimestampKeys = [
  'schedule_last_sync_at',
  'bookings_last_sync_at',
  'transactions_last_sync_at',
  'current_custody_last_sync_at',
] satisfies Array<
  keyof Pick<
    SyncMetadataRecord,
    | 'bookings_last_sync_at'
    | 'current_custody_last_sync_at'
    | 'schedule_last_sync_at'
    | 'transactions_last_sync_at'
  >
>

function getTimestampMs(timestamp: string | undefined): number | null {
  if (!timestamp) {
    return null
  }

  const timestampMs = Date.parse(timestamp)

  return Number.isFinite(timestampMs) ? timestampMs : null
}

/**
 * Finds the operational freshness timestamp while keeping old scoped metadata
 * usable until the new top-level marker exists for every active device.
 */
export function getOperationalFreshnessTimestamp(
  metadata: SyncMetadataRecord | undefined,
): string | null {
  if (!metadata) {
    return null
  }

  if (getTimestampMs(metadata.operational_last_sync_at) !== null) {
    return metadata.operational_last_sync_at ?? null
  }

  return datasetTimestampKeys
    .map((key) => metadata[key])
    .filter((timestamp): timestamp is string => getTimestampMs(timestamp) !== null)
    .sort((left, right) => Date.parse(right) - Date.parse(left))[0] ?? null
}

/** Classifies the local device freshness policy for one user + Club scope. */
export function classifyOfflineFreshness(
  lastSuccessfulOperationalSyncAt: string | null,
  now: Date = new Date(),
): OfflineFreshnessState {
  const syncedAtMs = getTimestampMs(lastSuccessfulOperationalSyncAt ?? undefined)

  if (syncedAtMs === null) {
    return {
      ageMs: null,
      canCreateNewOfflineRequest: true,
      lastSuccessfulOperationalSyncAt: null,
      level: 'unknown',
      warningText: null,
    }
  }

  const ageMs = Math.max(0, now.getTime() - syncedAtMs)

  if (ageMs > OFFLINE_FRESHNESS_RESTRICT_THRESHOLD_MS) {
    return {
      ageMs,
      canCreateNewOfflineRequest: false,
      lastSuccessfulOperationalSyncAt,
      level: 'creation_restricted',
      warningText: OFFLINE_CREATION_RESTRICTED_TEXT,
    }
  }

  if (ageMs >= OFFLINE_FRESHNESS_WARNING_THRESHOLD_MS) {
    return {
      ageMs,
      canCreateNewOfflineRequest: true,
      lastSuccessfulOperationalSyncAt,
      level: 'stale_warning',
      warningText: OFFLINE_STALE_WARNING_TEXT,
    }
  }

  return {
    ageMs,
    canCreateNewOfflineRequest: true,
    lastSuccessfulOperationalSyncAt,
    level: 'fresh',
    warningText: null,
  }
}

export function canCreateOfflineRequest(
  freshness: OfflineFreshnessState,
  isOfflineLike: boolean,
): boolean {
  return !isOfflineLike || freshness.canCreateNewOfflineRequest
}
