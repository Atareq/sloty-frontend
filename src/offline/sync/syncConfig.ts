export const OFFLINE_SYNC_RESUME_MIN_AGE_MS = 2 * 60 * 1000
export const OFFLINE_SYNC_FAILED_RETRY_DELAY_MS = 30 * 1000

export interface OfflineSyncConfig {
  resumeMinAgeMs: number
  failedRetryDelayMs: number
}

export const offlineSyncConfig: OfflineSyncConfig = {
  resumeMinAgeMs: OFFLINE_SYNC_RESUME_MIN_AGE_MS,
  failedRetryDelayMs: OFFLINE_SYNC_FAILED_RETRY_DELAY_MS,
}
