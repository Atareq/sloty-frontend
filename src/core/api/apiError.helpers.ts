import {
  ApiClientError,
  DEFAULT_API_ERROR_MESSAGE,
  type ApiFieldError,
} from './apiClient'

const blockedMessages = new Set(['', 'undefined', 'null', '[object Object]'])

const productErrorMessages: Readonly<Record<string, string>> = {
  BOOKING_SLOT_UNAVAILABLE: 'المعاد مبقاش متاح. اختار ميعاد تاني.',
  BOOKING_OUTSIDE_WORKING_HOURS:
    'الموعد خارج مواعيد عمل الملعب.',
  BOOKING_CLIENT_REQUEST_MISMATCH:
    'طلب الحجز ده متعارض مع طلب سابق. راجع البيانات وحاول تاني.',
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
  SETTLEMENT_CONFLICT: 'المبلغ اتغير. راجع آخر حالة وحاول مرة تانية.',
  PAYMENT_REFERENCE_REQUIRED: 'مرجع الدفع مطلوب لهذا الملعب.',
  BOOKING_CUSTOMER_IDENTITY_INCOMPLETE:
    'رقم الموبايل مطلوب عشان نحدد هوية العميل.',
  BOOKING_CLUB_PLAYER_NOT_FOUND: 'بيانات اللاعب غير مسجلة في هذا النادي.',
  BOOKING_CLUB_PLAYER_MISMATCH: 'بيانات اللاعب غير تابعة لهذا النادي.',
  BOOKING_CLUB_PLAYER_PHONE_MISMATCH: 'رقم الموبايل لا يطابق اللاعب المختار.',
  BOOKING_NOT_AVAILABLE: 'الموعد غير متاح حالياً.',
  BOOKING_CONFLICT: 'تعارض في الموعد. يرجى اختيار موعد آخر.',
  PERMISSION_DENIED: 'ليس لديك صلاحية لتنفيذ هذا الإجراء.',
  CLUB_ACCESS_REVOKED:
    'صلاحيتك على النادي ده مش نشطة. اختار نادي تاني أو سجّل الخروج.',
}

function isSafeMessage(message: string | undefined): message is string {
  if (message === undefined) {
    return false
  }

  const trimmedMessage = message.trim()

  return !blockedMessages.has(trimmedMessage)
}

export const PAYMENT_REFERENCE_REQUIRED_CODE = 'PAYMENT_REFERENCE_REQUIRED'
export const PAYMENT_REFERENCE_REQUIRED_MESSAGE =
  productErrorMessages[PAYMENT_REFERENCE_REQUIRED_CODE]

export const BOOKING_CUSTOMER_IDENTITY_INCOMPLETE_CODE =
  'BOOKING_CUSTOMER_IDENTITY_INCOMPLETE'
export const BOOKING_CLUB_PLAYER_NOT_FOUND_CODE = 'BOOKING_CLUB_PLAYER_NOT_FOUND'
export const BOOKING_CLUB_PLAYER_MISMATCH_CODE = 'BOOKING_CLUB_PLAYER_MISMATCH'
export const BOOKING_CLUB_PLAYER_PHONE_MISMATCH_CODE = 'BOOKING_CLUB_PLAYER_PHONE_MISMATCH'

export const BOOKING_NOT_AVAILABLE_CODE = 'BOOKING_NOT_AVAILABLE'
export const BOOKING_CONFLICT_CODE = 'BOOKING_CONFLICT'
export const PERMISSION_DENIED_CODE = 'PERMISSION_DENIED'

export function isApiClientError(error: unknown): error is ApiClientError {
  return error instanceof ApiClientError
}

export function getApiErrorMessage(
  error: unknown,
  fallback = DEFAULT_API_ERROR_MESSAGE,
): string {
  if (isApiClientError(error)) {
    if (error.code) {
      const productMessage = productErrorMessages[error.code]

      if (productMessage) {
        return productMessage
      }
    }

    if (error.fieldErrors) {
      for (const fieldErrors of Object.values(error.fieldErrors)) {
        for (const fieldError of fieldErrors) {
          if (fieldError.code && productErrorMessages[fieldError.code]) {
            return productErrorMessages[fieldError.code]
          }
        }
      }
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
  const fieldError = fieldErrors?.[fieldName]?.[0]

  if (!fieldError) {
    return null
  }

  if (fieldError.code && productErrorMessages[fieldError.code]) {
    return productErrorMessages[fieldError.code]
  }

  const message = fieldError.message

  return isSafeMessage(message) ? message.trim() : null
}
