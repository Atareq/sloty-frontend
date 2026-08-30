import type { OfflineContextInput } from '../offline.types'
import { offlineRepositories } from '../repositories/offlineRepositories'

const OFFLINE_WRITE_FAILURE_MESSAGE =
  'تعذر تحديث التخزين المحلي الآمن.'
const OFFLINE_CLEANUP_FAILURE_MESSAGE =
  'تعذر مسح التخزين المحلي الآمن بالكامل.'

/** Persists verified context without making IndexedDB a React crash boundary. */
export async function safelyPersistOfflineContext(
  input: OfflineContextInput,
): Promise<boolean> {
  try {
    await offlineRepositories.saveOfflineContext(input)
    return true
  } catch {
    console.error(OFFLINE_WRITE_FAILURE_MESSAGE)
    return false
  }
}

/**
 * Best-effort logout cleanup with a generic, non-sensitive failure signal.
 * Scoped repository reads remain the cross-user safety boundary if cleanup is
 * unavailable in a browser.
 */
export async function safelyClearUserOperationalData(
  userId: number,
): Promise<boolean> {
  try {
    await offlineRepositories.clearUserOperationalData(userId)
    return true
  } catch {
    console.error(OFFLINE_CLEANUP_FAILURE_MESSAGE)
    return false
  }
}
