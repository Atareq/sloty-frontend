import {
  canChooseOperationalCourt,
} from '../../core/auth/auth.types'
import {
  listBookings as defaultListBookings,
} from '../../features/bookings/bookingsApi'
import type {
  Booking,
  BookingsQueryParams,
} from '../../features/bookings/bookings.types'
import type { PaginatedResponse } from '../../shared/api/api.types'
import type { OfflineScope } from '../offline.types'
import { offlineRepositories } from '../repositories/offlineRepositories'
import type {
  DatasetSyncTask,
  OperationalSyncContext,
} from '../sync/sync.types'
import { getBookingSyncWindow } from './bookingSyncWindow'

interface BookingSyncRepositories {
  replaceBookingsSnapshot: (
    scope: OfflineScope,
    bookings: Booking[],
    syncedAt: string,
  ) => Promise<void>
}

interface CreateBookingSyncTaskOptions {
  repositories?: BookingSyncRepositories
  listBookings?: (
    clubSlug: string,
    params?: BookingsQueryParams,
    options?: { signal?: AbortSignal },
  ) => Promise<PaginatedResponse<Booking>>
  getNow?: () => Date
  logger?: (message: string) => void
}

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) {
    throw new DOMException('Booking sync was cancelled.', 'AbortError')
  }
}

function buildCanonicalBookingSyncParams(
  context: OperationalSyncContext,
  getNow: () => Date,
): BookingsQueryParams | null {
  if (
    !canChooseOperationalCourt(context.role, context.membership) &&
    context.assignedCourtId === null
  ) {
    return null
  }

  const window = getBookingSyncWindow(getNow())

  return {
    date_from: window.dateFrom,
    date_to: window.dateTo,
    ...(!canChooseOperationalCourt(context.role, context.membership)
      ? { court: context.assignedCourtId ?? undefined }
      : {}),
  }
}

/**
 * Creates the canonical Booking History snapshot sync task.
 *
 * The task intentionally fetches an unfiltered previous-7-calendar-day period
 * and commits only after every paginated page succeeds. UI search/filter
 * results must not be passed here.
 */
export function createBookingSyncTask(
  options: CreateBookingSyncTaskOptions = {},
): DatasetSyncTask {
  const repositories = options.repositories ?? offlineRepositories
  const listBookings = options.listBookings ?? defaultListBookings
  const getNow = options.getNow ?? (() => new Date())
  const logger = options.logger

  return {
    dataset: 'bookings',
    async run({ operationalContext, signal, startedAt }) {
      const baseParams = buildCanonicalBookingSyncParams(
        operationalContext,
        getNow,
      )

      if (!baseParams) {
        return {
          dataset: 'bookings',
          status: 'skipped',
          reason: 'no_authorized_booking_scope',
        }
      }

      const bookings: Booking[] = []
      let page = 1
      let hasNextPage = true

      while (hasNextPage) {
        throwIfAborted(signal)
        const params: BookingsQueryParams = {
          ...baseParams,
          ...(page > 1 ? { page: String(page) } : {}),
        }

        logger?.(
          `[booking-sync] scope=${operationalContext.scopeKey} page=${page}`,
        )
        const response = await listBookings(
          operationalContext.clubSlug,
          params,
          { signal },
        )

        bookings.push(...response.results)
        hasNextPage = Boolean(response.next)
        page += 1
      }

      throwIfAborted(signal)
      await repositories.replaceBookingsSnapshot(
        operationalContext,
        bookings,
        startedAt,
      )

      logger?.(
        `[booking-sync] success scope=${operationalContext.scopeKey} count=${bookings.length}`,
      )

      return {
        dataset: 'bookings',
        status: 'success',
        committedAt: startedAt,
      }
    },
  }
}
