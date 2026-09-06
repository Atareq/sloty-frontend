import type {
  OfflineContextInput,
  OfflineContextRecord,
  OfflineScope,
} from '../offline.types'
import { offlineRepositories } from '../repositories/offlineRepositories'

const OFFLINE_WRITE_FAILURE_MESSAGE =
  'تعذر تحديث التخزين المحلي الآمن.'
const OFFLINE_CLEANUP_FAILURE_MESSAGE =
  'تعذر مسح التخزين المحلي الآمن بالكامل.'
const OFFLINE_READ_FAILURE_MESSAGE =
  'تعذر قراءة التخزين المحلي الآمن.'

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

/** Reads a verified offline context without leaking storage errors to React. */
export async function safelyReadOfflineContext(
  scope: OfflineScope,
): Promise<OfflineContextRecord | null> {
  try {
    return (await offlineRepositories.readOfflineContext(scope)) ?? null
  } catch {
    console.error(OFFLINE_READ_FAILURE_MESSAGE)
    return null
  }
}

/**
 * Reads the latest verified context for a selected Club. This is only used for
 * offline cold-start when no token identity exists; explicit logout deletes the
 * context before auth state is released.
 */
export async function safelyReadLatestOfflineContextForClub(
  clubSlug: string,
): Promise<OfflineContextRecord | null> {
  try {
    return (await offlineRepositories.readLatestOfflineContextForClub(clubSlug)) ?? null
  } catch {
    console.error(OFFLINE_READ_FAILURE_MESSAGE)
    return null
  }
}

/** Deletes exactly one user + Club operational scope after backend revocation. */
export async function safelyClearScope(
  scope: OfflineScope,
): Promise<boolean> {
  try {
    await offlineRepositories.clearScope(scope)
    return true
  } catch {
    console.error(OFFLINE_CLEANUP_FAILURE_MESSAGE)
    return false
  }
}
