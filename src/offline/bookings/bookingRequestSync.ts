import { getAccountStateAction } from '../../core/auth/accountState'
import {
  getApiErrorCode,
  getApiFieldErrors,
  isApiClientError,
} from '../../core/api/apiError.helpers'
import type { ApiFieldError } from '../../core/api/apiClient'
import {
  createBooking as defaultCreateBooking,
} from '../../features/schedule/scheduleApi'
import type {
  BookingCreatePayload,
  BookingListItem,
} from '../../features/schedule/scheduleApi.types'
import type {
  BookingIntentRecord,
  BookingRequestReviewReason,
  OfflineScope,
} from '../offline.types'
import {
  offlineRepositories,
  type BookingIntentUpdate,
} from '../repositories/offlineRepositories'
import { createOfflineScopeKey } from '../scope/offlineScope'
import { bookingRequestEditLocks } from './bookingRequestEditLocks'

export const STALE_SYNCING_RECOVERY_MS = 5 * 60 * 1000

type BookingCreate = (
  clubSlug: string,
  payload: BookingCreatePayload,
  options?: { signal?: AbortSignal },
) => Promise<BookingListItem>

interface BookingRequestSyncRepositories {
  getBookingIntent: (
    scope: OfflineScope,
    localId: string,
  ) => Promise<BookingIntentRecord | undefined>
  getBookingRequestsForSync: (
    scope: OfflineScope,
    courtIds: number[],
  ) => Promise<BookingIntentRecord[]>
  updateBookingIntent: (
    scope: OfflineScope,
    localId: string,
    updates: BookingIntentUpdate,
  ) => Promise<BookingIntentRecord | undefined>
  updateBookingIntentStatus: (
    scope: OfflineScope,
    localId: string,
    status: BookingIntentRecord['status'],
    options?: {
      lastAttemptAt?: string | null
      reviewReason?: BookingRequestReviewReason | null
      resolvedBookingId?: number | null
    },
  ) => Promise<BookingIntentRecord | undefined>
}

export type BookingRequestStopReason =
  | 'auth_required'
  | 'account_unavailable'
  | 'club_access_revoked'

export type BookingRequestProcessOutcome =
  | 'booked'
  | 'needs_review'
  | 'pending_retry'
  | 'integrity_mismatch'
  | 'unknown_nonretryable'
  | 'auth_stopped'
  | 'access_stopped'
  | 'skipped'

export interface BookingRequestProcessResult {
  localId: string
  outcome: BookingRequestProcessOutcome
  stopReason?: BookingRequestStopReason
}

export interface BookingRequestQueueResult {
  processed: number
  booked: number
  needsReview: number
  pendingRetry: number
  skipped: number
  integrityMismatch: number
  unknownNonretryable: number
  stopped: boolean
  stopReason: BookingRequestStopReason | null
  results: BookingRequestProcessResult[]
}

interface ProcessBookingRequestOptions {
  scope: OfflineScope
  localId: string
  repositories?: BookingRequestSyncRepositories
  createBooking?: BookingCreate
  getNow?: () => Date
  signal?: AbortSignal
}

interface ProcessPendingBookingRequestsOptions {
  scope: OfflineScope
  courtIds: number[]
  repositories?: BookingRequestSyncRepositories
  createBooking?: BookingCreate
  getNow?: () => Date
  signal?: AbortSignal
}

type ClassifiedBookingCreateError =
  | { type: 'retryable_technical' }
  | { type: 'needs_review'; reason: BookingRequestReviewReason }
  | { type: 'auth_stopped'; stopReason: BookingRequestStopReason }
  | { type: 'integrity_mismatch' }
  | { type: 'unknown_nonretryable' }

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) {
    throw new DOMException('Booking Request sync was cancelled.', 'AbortError')
  }
}

function hasCustomerFieldError(
  fieldErrors: Record<string, ApiFieldError[]> | null,
): boolean {
  if (!fieldErrors) {
    return false
  }

  return (
    Object.prototype.hasOwnProperty.call(fieldErrors, 'customer_name') ||
    Object.prototype.hasOwnProperty.call(fieldErrors, 'customer_phone') ||
    Object.prototype.hasOwnProperty.call(fieldErrors, 'phone_number')
  )
}

function isRetryableTechnicalError(error: unknown): boolean {
  if (isAbortError(error)) {
    return false
  }

  if (error instanceof DOMException) {
    return error.name === 'TimeoutError' || error.name === 'NetworkError'
  }

  if (!isApiClientError(error)) {
    return false
  }

  return (
    error.code === 'NETWORK_ERROR' ||
    error.status === 0 ||
    error.status === 408 ||
    error.status === 502 ||
    error.status === 503 ||
    error.status === 504 ||
    error.status >= 500
  )
}

export function classifyBookingRequestSyncError(
  error: unknown,
): ClassifiedBookingCreateError {
  const accountStateAction = getAccountStateAction(error)

  if (accountStateAction.type === 'auth_required') {
    return { type: 'auth_stopped', stopReason: 'auth_required' }
  }

  if (accountStateAction.type === 'clear_user') {
    return { type: 'auth_stopped', stopReason: 'account_unavailable' }
  }

  if (accountStateAction.type === 'clear_club') {
    return { type: 'auth_stopped', stopReason: 'club_access_revoked' }
  }

  const code = getApiErrorCode(error)

  if (isRetryableTechnicalError(error)) {
    return { type: 'retryable_technical' }
  }

  if (code === 'BOOKING_SLOT_UNAVAILABLE') {
    return { type: 'needs_review', reason: 'SLOT_UNAVAILABLE' }
  }

  if (code === 'RECURRING_UNAVAILABLE') {
    return { type: 'needs_review', reason: 'RECURRING_UNAVAILABLE' }
  }

  if (code === 'VALIDATION_ERROR' && hasCustomerFieldError(getApiFieldErrors(error))) {
    return { type: 'needs_review', reason: 'INVALID_CUSTOMER_DATA' }
  }

  if (code === 'BOOKING_CLIENT_REQUEST_MISMATCH') {
    return { type: 'integrity_mismatch' }
  }

  return { type: 'unknown_nonretryable' }
}

export function buildBookingCreatePayloadFromRequest(
  request: BookingIntentRecord,
): BookingCreatePayload {
  return {
    court: request.court_id,
    customer_name: request.customer_name,
    customer_phone: request.customer_phone,
    start_time: request.requested_start,
    end_time: request.requested_end,
    client_request_id: request.client_request_id,
    is_recurring: request.requested_recurring,
    ...(request.notes ? { notes: request.notes } : {}),
  }
}

function isStaleSyncing(
  request: BookingIntentRecord,
  now: Date,
): boolean {
  if (request.status !== 'SYNCING' || !request.last_attempt_at) {
    return false
  }

  return now.getTime() - new Date(request.last_attempt_at).getTime() >=
    STALE_SYNCING_RECOVERY_MS
}

function isEligibleForProcessing(
  request: BookingIntentRecord,
  scopeKey: string,
  now: Date,
): boolean {
  if (bookingRequestEditLocks.isLocked(scopeKey, request.local_id)) {
    return false
  }

  return request.status === 'PENDING_SYNC' || isStaleSyncing(request, now)
}

async function restoreRetryableStatus(
  repositories: BookingRequestSyncRepositories,
  scope: OfflineScope,
  localId: string,
): Promise<void> {
  await repositories.updateBookingIntentStatus(scope, localId, 'PENDING_SYNC', {
    reviewReason: null,
  })
}

export async function processBookingRequest(
  options: ProcessBookingRequestOptions,
): Promise<BookingRequestProcessResult> {
  const repositories = options.repositories ?? offlineRepositories
  const createBooking = options.createBooking ?? defaultCreateBooking
  const getNow = options.getNow ?? (() => new Date())
  const scopeKey = createOfflineScopeKey(options.scope)
  const now = getNow()

  throwIfAborted(options.signal)

  const request = await repositories.getBookingIntent(
    options.scope,
    options.localId,
  )

  if (!request || !isEligibleForProcessing(request, scopeKey, now)) {
    return { localId: options.localId, outcome: 'skipped' }
  }

  const attemptAt = now.toISOString()
  const syncingRequest = await repositories.updateBookingIntentStatus(
    options.scope,
    request.local_id,
    'SYNCING',
    {
      lastAttemptAt: attemptAt,
      reviewReason: null,
    },
  )

  if (!syncingRequest) {
    return { localId: request.local_id, outcome: 'skipped' }
  }

  throwIfAborted(options.signal)

  try {
    const booking = await createBooking(
      options.scope.clubSlug,
      buildBookingCreatePayloadFromRequest(syncingRequest),
      { signal: options.signal },
    )

    await repositories.updateBookingIntentStatus(
      options.scope,
      syncingRequest.local_id,
      'BOOKED',
      {
        lastAttemptAt: attemptAt,
        resolvedBookingId: booking.id,
        reviewReason: null,
      },
    )

    return { localId: syncingRequest.local_id, outcome: 'booked' }
  } catch (error) {
    if (isAbortError(error)) {
      throw error
    }

    const classification = classifyBookingRequestSyncError(error)

    if (classification.type === 'retryable_technical') {
      await restoreRetryableStatus(
        repositories,
        options.scope,
        syncingRequest.local_id,
      )

      return { localId: syncingRequest.local_id, outcome: 'pending_retry' }
    }

    if (classification.type === 'needs_review') {
      await repositories.updateBookingIntentStatus(
        options.scope,
        syncingRequest.local_id,
        'NEEDS_REVIEW',
        {
          lastAttemptAt: attemptAt,
          reviewReason: classification.reason,
        },
      )

      return { localId: syncingRequest.local_id, outcome: 'needs_review' }
    }

    if (classification.type === 'integrity_mismatch') {
      await repositories.updateBookingIntentStatus(
        options.scope,
        syncingRequest.local_id,
        'NEEDS_REVIEW',
        {
          lastAttemptAt: attemptAt,
          reviewReason: null,
        },
      )

      return {
        localId: syncingRequest.local_id,
        outcome: 'integrity_mismatch',
      }
    }

    if (classification.type === 'auth_stopped') {
      await restoreRetryableStatus(
        repositories,
        options.scope,
        syncingRequest.local_id,
      )

      return {
        localId: syncingRequest.local_id,
        outcome:
          classification.stopReason === 'club_access_revoked'
            ? 'access_stopped'
            : 'auth_stopped',
        stopReason: classification.stopReason,
      }
    }

    await repositories.updateBookingIntentStatus(
      options.scope,
      syncingRequest.local_id,
      'NEEDS_REVIEW',
      {
        lastAttemptAt: attemptAt,
        reviewReason: null,
      },
    )

    return {
      localId: syncingRequest.local_id,
      outcome: 'unknown_nonretryable',
    }
  }
}

function createEmptyQueueResult(): BookingRequestQueueResult {
  return {
    processed: 0,
    booked: 0,
    needsReview: 0,
    pendingRetry: 0,
    skipped: 0,
    integrityMismatch: 0,
    unknownNonretryable: 0,
    stopped: false,
    stopReason: null,
    results: [],
  }
}

function recordProcessResult(
  queueResult: BookingRequestQueueResult,
  result: BookingRequestProcessResult,
): void {
  queueResult.results.push(result)

  switch (result.outcome) {
    case 'booked':
      queueResult.processed += 1
      queueResult.booked += 1
      return
    case 'needs_review':
      queueResult.processed += 1
      queueResult.needsReview += 1
      return
    case 'pending_retry':
      queueResult.processed += 1
      queueResult.pendingRetry += 1
      return
    case 'integrity_mismatch':
      queueResult.processed += 1
      queueResult.integrityMismatch += 1
      queueResult.needsReview += 1
      return
    case 'unknown_nonretryable':
      queueResult.processed += 1
      queueResult.unknownNonretryable += 1
      queueResult.needsReview += 1
      return
    case 'auth_stopped':
    case 'access_stopped':
      queueResult.processed += 1
      queueResult.stopped = true
      queueResult.stopReason = result.stopReason ?? 'auth_required'
      return
    case 'skipped':
      queueResult.skipped += 1
      return
  }
}

export async function processPendingBookingRequests(
  options: ProcessPendingBookingRequestsOptions,
): Promise<BookingRequestQueueResult> {
  const repositories = options.repositories ?? offlineRepositories
  const getNow = options.getNow ?? (() => new Date())
  const queueResult = createEmptyQueueResult()
  const uniqueCourtIds = [...new Set(options.courtIds)].filter(Number.isSafeInteger)

  if (uniqueCourtIds.length === 0) {
    return queueResult
  }

  const candidates = await repositories.getBookingRequestsForSync(
    options.scope,
    uniqueCourtIds,
  )

  for (const candidate of candidates) {
    throwIfAborted(options.signal)

    const result = await processBookingRequest({
      scope: options.scope,
      localId: candidate.local_id,
      repositories,
      createBooking: options.createBooking,
      getNow,
      signal: options.signal,
    })

    recordProcessResult(queueResult, result)

    if (queueResult.stopped) {
      break
    }
  }

  return queueResult
}
