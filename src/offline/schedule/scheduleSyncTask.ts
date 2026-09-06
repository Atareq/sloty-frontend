import {
  canChooseOperationalCourt,
} from '../../core/auth/auth.types'
import { listCourts as defaultListCourts } from '../../features/courts/courtsApi'
import type { Court } from '../../features/courts/courts.types'
import {
  listBookingSlots as defaultListBookingSlots,
} from '../../features/schedule/scheduleApi'
import type { BookingSlotsResponse } from '../../features/schedule/scheduleApi.types'
import {
  offlineRepositories,
  type ScheduleDaySnapshot,
} from '../repositories/offlineRepositories'
import type { OfflineScope } from '../offline.types'
import { buildScheduleDaySnapshots } from './scheduleSnapshot'
import { getPreferredScheduleCourt } from './scheduleSyncPreference'
import { getScheduleSyncWindow } from './scheduleSyncWindow'
import type {
  DatasetSyncTask,
  DatasetSyncTaskResult,
  OperationalSyncContext,
} from '../sync/sync.types'

interface ScheduleSyncRepositories {
  replaceScheduleWindow: (
    scope: OfflineScope,
    courtId: number,
    days: ScheduleDaySnapshot[],
    syncedAt: string,
  ) => Promise<void>
}

interface CreateScheduleSyncTaskOptions {
  repositories?: ScheduleSyncRepositories
  listCourts?: (
    clubSlug: string,
    options?: { signal?: AbortSignal },
  ) => Promise<{ results: Court[] }>
  listBookingSlots?: (
    clubSlug: string,
    params: {
      court: number
      date_from: string
      date_to: string
    },
    options?: { signal?: AbortSignal },
  ) => Promise<BookingSlotsResponse>
  getNow?: () => Date
  logger?: (message: string) => void
}

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) {
    throw new DOMException('Schedule sync was cancelled.', 'AbortError')
  }
}

function orderCourtsByPreference(
  courts: number[],
  preferredCourtId: number | null,
): number[] {
  const uniqueCourtIds = [...new Set(courts)]

  if (!preferredCourtId || !uniqueCourtIds.includes(preferredCourtId)) {
    return uniqueCourtIds
  }

  return [
    preferredCourtId,
    ...uniqueCourtIds.filter((courtId) => courtId !== preferredCourtId),
  ]
}

export async function getAuthorizedScheduleCourtIds(
  context: OperationalSyncContext,
  signal: AbortSignal,
  listCourts: NonNullable<CreateScheduleSyncTaskOptions['listCourts']> = defaultListCourts,
): Promise<number[]> {
  if (!canChooseOperationalCourt(context.role, context.membership)) {
    return context.assignedCourtId ? [context.assignedCourtId] : []
  }

  const response = await listCourts(context.clubSlug, { signal })

  return response.results
    .filter((court) => court.is_active)
    .map((court) => court.id)
}

/**
 * Creates the real Schedule dataset sync task used by the Task-3 coordinator.
 */
export function createScheduleSyncTask(
  options: CreateScheduleSyncTaskOptions = {},
): DatasetSyncTask {
  const repositories = options.repositories ?? offlineRepositories
  const listCourts = options.listCourts ?? defaultListCourts
  const listBookingSlots = options.listBookingSlots ?? defaultListBookingSlots
  const getNow = options.getNow ?? (() => new Date())
  const logger = options.logger

  return {
    dataset: 'schedule',
    async run({ operationalContext, signal, startedAt }) {
      const window = getScheduleSyncWindow(getNow())
      const authorizedCourtIds = await getAuthorizedScheduleCourtIds(
        operationalContext,
        signal,
        listCourts,
      )
      const preferredCourtId = getPreferredScheduleCourt(
        operationalContext.scopeKey,
      )
      const orderedCourtIds = orderCourtsByPreference(
        authorizedCourtIds,
        preferredCourtId,
      )

      if (orderedCourtIds.length === 0) {
        return {
          dataset: 'schedule',
          status: 'skipped',
          reason: 'no_authorized_court',
        }
      }

      const failedCourts: number[] = []
      const successfulCourts: number[] = []

      for (const courtId of orderedCourtIds) {
        throwIfAborted(signal)
        logger?.(
          `[schedule-sync] scope=${operationalContext.scopeKey} court=${courtId} range=${window.dateFrom}..${window.dateTo}`,
        )

        try {
          const response = await listBookingSlots(
            operationalContext.clubSlug,
            {
              court: courtId,
              date_from: window.dateFrom,
              date_to: window.dateTo,
            },
            { signal },
          )
          const snapshots = buildScheduleDaySnapshots(response, window.dates)

          await repositories.replaceScheduleWindow(
            operationalContext,
            courtId,
            snapshots,
            startedAt,
          )
          successfulCourts.push(courtId)
          logger?.(
            `[schedule-sync] success scope=${operationalContext.scopeKey} court=${courtId} days=${snapshots.length}`,
          )
        } catch {
          throwIfAborted(signal)
          failedCourts.push(courtId)
          logger?.(
            `[schedule-sync] failed scope=${operationalContext.scopeKey} court=${courtId}`,
          )
        }
      }

      const result: DatasetSyncTaskResult = {
        dataset: 'schedule',
        status: successfulCourts.length > 0 ? 'success' : 'failed',
        committedAt: successfulCourts.length > 0 ? startedAt : undefined,
        metadata: {
          successfulCourtIds: successfulCourts,
          failedCourtIds: failedCourts,
        },
        reason:
          failedCourts.length > 0
            ? `failed_courts:${failedCourts.join(',')}`
            : undefined,
      }

      return result
    },
  }
}
