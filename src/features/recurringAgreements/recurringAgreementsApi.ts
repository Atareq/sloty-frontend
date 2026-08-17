import { apiRequest } from '../../core/api/apiClient'
import type { PaginatedResponse } from '../../shared/api/api.types'
import { apiEndpoints } from '../../shared/api/apiEndpoints'
import type {
  RecurringAgreement,
  RecurringAgreementAvailabilityParams,
  RecurringAgreementAvailabilityResponse,
  RecurringAgreementCancelPayload,
  RecurringAgreementCancellationPreview,
  RecurringAgreementCreatePayload,
} from './recurringAgreements.types'

function buildQuery(
  params: Array<[string, string | number]>,
): string {
  const searchParams = new URLSearchParams()

  params.forEach(([key, value]) => {
    searchParams.set(key, String(value))
  })

  return searchParams.toString()
}

/**
 * Lists recurring weekly agreements for the active club context.
 */
export function listRecurringAgreements(
  clubSlug: string,
): Promise<PaginatedResponse<RecurringAgreement> | RecurringAgreement[]> {
  return apiRequest(apiEndpoints.clubs.recurringAgreements.list(clubSlug))
}

/**
 * Loads one recurring agreement detail by backend ID.
 */
export function getRecurringAgreement(
  clubSlug: string,
  agreementId: number | string,
): Promise<RecurringAgreement> {
  return apiRequest(
    apiEndpoints.clubs.recurringAgreements.detail(clubSlug, agreementId),
  )
}

/**
 * Checks backend recurring availability for the selected weekly slot.
 */
export function getRecurringAgreementAvailability(
  clubSlug: string,
  params: RecurringAgreementAvailabilityParams,
): Promise<RecurringAgreementAvailabilityResponse> {
  return apiRequest(
    `${apiEndpoints.clubs.recurringAgreements.availability(clubSlug)}?${buildQuery([
      ['court', params.court],
      ['weekday', params.weekday],
      ['start_time', params.start_time],
      ['end_time', params.end_time],
      ['start_date', params.start_date],
    ])}`,
  )
}

/**
 * Creates a recurring agreement. Backend calculates the security deposit.
 */
export function createRecurringAgreement(
  clubSlug: string,
  payload: RecurringAgreementCreatePayload,
): Promise<RecurringAgreement> {
  return apiRequest(apiEndpoints.clubs.recurringAgreements.list(clubSlug), {
    method: 'POST',
    body: payload,
  })
}

/**
 * Requests the backend cancellation preview before final cancellation.
 */
export function getRecurringCancellationPreview(
  clubSlug: string,
  agreementId: number | string,
  payload: RecurringAgreementCancelPayload,
): Promise<RecurringAgreementCancellationPreview> {
  return apiRequest(
    apiEndpoints.clubs.recurringAgreements.cancellationPreview(
      clubSlug,
      agreementId,
    ),
    {
      method: 'POST',
      body: payload,
    },
  )
}

/**
 * Cancels a recurring agreement after the preview step.
 */
export function cancelRecurringAgreement(
  clubSlug: string,
  agreementId: number | string,
  payload: RecurringAgreementCancelPayload,
): Promise<RecurringAgreement> {
  return apiRequest(
    apiEndpoints.clubs.recurringAgreements.cancel(clubSlug, agreementId),
    {
      method: 'POST',
      body: payload,
    },
  )
}

/**
 * Requests deposit refund when the backend marks the deposit as refundable.
 */
export function refundRecurringDeposit(
  clubSlug: string,
  agreementId: number | string,
): Promise<RecurringAgreement> {
  return apiRequest(
    apiEndpoints.clubs.recurringAgreements.refundDeposit(
      clubSlug,
      agreementId,
    ),
    {
      method: 'POST',
    },
  )
}
