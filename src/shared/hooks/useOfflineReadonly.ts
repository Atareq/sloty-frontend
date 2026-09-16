import { useContext } from 'react'
import {
  OfflineSyncContext,
  useOfflineSync,
} from '../../offline/sync/offlineSyncContext'

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
  let isOffline = false

  try {
    const sync = typeof useOfflineSync === 'function' ? useOfflineSync() : null
    if (sync) {
      isOffline = Boolean(
        sync.connectivity.browserNetwork === 'offline' ||
          sync.connectivity.backendReachability === 'unreachable',
      )
    }
  } catch {
    // If outside OfflineSyncProvider or useOfflineSync threw, try useContext directly
    try {
      const context =
        typeof OfflineSyncContext !== 'undefined' && OfflineSyncContext
          ? useContext(OfflineSyncContext)
          : null
      if (context) {
        isOffline = Boolean(
          context.connectivity.browserNetwork === 'offline' ||
            context.connectivity.backendReachability === 'unreachable',
        )
      } else if (typeof navigator !== 'undefined' && !navigator.onLine) {
        isOffline = true
      }
    } catch {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        isOffline = true
      }
    }
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    isOffline = true
  }

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

