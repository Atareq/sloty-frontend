import {
  ApiClientError,
  DEFAULT_API_ERROR_MESSAGE,
  type ApiFieldError,
} from './apiClient'

const blockedMessages = new Set(['', 'undefined', 'null', '[object Object]'])

const productErrorMessages: Readonly<Record<string, string>> = {
  BOOKING_SLOT_UNAVAILABLE: 'المعاد مبقاش متاح. اختار ميعاد تاني.',
  BOOKING_COMPLETION_REQUIRES_FULL_PAYMENT:
    'لازم تحصّل المبلغ المتبقي قبل إكمال الحجز.',
  RECURRENCE_CONTINUATION_DECISION_REQUIRED:
    'اختار إذا كان الموعد الأسبوعي هيستمر ولا هيتوقف.',
  BOOKING_RECURRENCE_NOT_ACTIVE: 'التكرار الأسبوعي للحجز ده مش نشط.',
  RECURRING_BOOKING_RESCHEDULE_NOT_SUPPORTED:
    'لتغيير المعاد الأسبوعي، أوقف التكرار الحالي واعمل حجز جديد.',
  RECURRENCE_CANNOT_CONTINUE:
    'مش متاح استمرار نفس الموعد الأسبوعي دلوقتي.',
  NEXT_RECURRING_SLOT_UNAVAILABLE:
    'الموعد الأسبوع القادم مش متاح. تقدر تكمل الحجز وتوقف التكرار.',
  SELF_SETTLEMENT_APPROVAL_FORBIDDEN: 'مينفعش تسوي عهدتك بنفسك.',
    NO_UNSETTLED_TRANSACTIONS:
    'مفيش مبلغ للموظف ده دلوقتي.',
}

function isSafeMessage(message: string | undefined): message is string {
  if (message === undefined) {
    return false
  }

  const trimmedMessage = message.trim()

  return !blockedMessages.has(trimmedMessage)
}

export function isApiClientError(error: unknown): error is ApiClientError {
  return error instanceof ApiClientError
}

export function getApiErrorMessage(
  error: unknown,
  fallback = DEFAULT_API_ERROR_MESSAGE,
): string {
  if (isApiClientError(error) && error.code) {
    const productMessage = productErrorMessages[error.code]

    if (productMessage) {
      return productMessage
    }
  }

  if (isApiClientError(error) && isSafeMessage(error.message)) {
    return error.message.trim()
  }

  if (isSafeMessage(fallback)) {
    return fallback.trim()
  }

  return DEFAULT_API_ERROR_MESSAGE
}

export function getApiErrorCode(error: unknown): string | null {
  return isApiClientError(error) && error.code ? error.code : null
}

export function getApiFieldErrors(
  error: unknown,
): Record<string, ApiFieldError[]> | null {
  return isApiClientError(error) && error.fieldErrors
    ? error.fieldErrors
    : null
}

export function getApiErrorDetails(
  error: unknown,
): Record<string, unknown> | null {
  return isApiClientError(error) && error.details ? error.details : null
}

export function getApiRequestId(error: unknown): string | null {
  return isApiClientError(error) && error.requestId ? error.requestId : null
}

export function getFirstFieldErrorMessage(
  fieldErrors: Record<string, ApiFieldError[]> | null,
  fieldName: string,
): string | null {
  const message = fieldErrors?.[fieldName]?.[0]?.message

  return isSafeMessage(message) ? message.trim() : null
}
