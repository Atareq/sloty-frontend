import { useContext } from 'react'
import { OfflineSyncContext } from '../../offline/sync/offlineSyncContext'

export interface OfflineReadonlyState {
  isOffline: boolean
  offlineMessage: string
  blockOfflineMutation: (onError?: (message: string) => void) => boolean
}

/**
 * Global offline read-only guard hook.
 *
 * In Sloty, offline operational mutations are strictly limited to saving
 * local Booking Requests from cached available FREE slots.
 *
 * All other mutations (booking creations, payments, cancellations, completions,
 * settlements, no-shows, reschedules, recurrence stops) require active server connectivity.
 */
export function useOfflineReadonly(
  customMessage = 'يحتاج اتصال بالإنترنت',
): OfflineReadonlyState {
  const sync = useContext(OfflineSyncContext)
  const isOfflineFromSync = Boolean(
    sync &&
      (sync.connectivity.browserNetwork === 'offline' ||
        sync.connectivity.backendReachability === 'unreachable'),
  )
  const isOfflineFromBrowser =
    typeof navigator !== 'undefined' && !navigator.onLine
  const isOffline = isOfflineFromSync || isOfflineFromBrowser

  return {
    isOffline,
    offlineMessage: customMessage,
    blockOfflineMutation: (onError) => {
      if (isOffline) {
        onError?.(customMessage)
        return true
      }
      return false
    },
  }
}
