import { describe, expect, it } from 'vitest'
import { ApiClientError } from './apiClient'
import {
  getApiErrorCode,
  getApiErrorDetails,
  getApiErrorMessage,
  getApiRequestId,
  getApiFieldErrors,
  getFirstFieldErrorMessage,
  isApiClientError,
} from './apiError.helpers'

describe('api error helpers', () => {
  const error = new ApiClientError('رسالة من الخلفية', 400, {
    code: 'VALIDATION_ERROR',
    fieldErrors: {
      customer_phone: [
        {
          code: 'INVALID_PHONE',
          message: 'رقم الهاتف غير صحيح',
        },
      ],
    },
    details: { source: 'backend' },
    requestId: 'req-123',
  })

  it('recognizes ApiClientError instances', () => {
    expect(isApiClientError(error)).toBe(true)
    expect(isApiClientError(new Error('plain'))).toBe(false)
  })

  it('returns backend message and safe fallback message', () => {
    expect(getApiErrorMessage(error)).toBe('رسالة من الخلفية')
    expect(getApiErrorMessage(new Error('plain'), 'رسالة آمنة')).toBe(
      'رسالة آمنة',
    )
    expect(getApiErrorMessage({}, 'undefined')).toBe(
      'حدث خطأ غير متوقع. حاول مرة أخرى.',
    )
  })

  it('returns code, field errors, details, and first field message', () => {
    expect(getApiErrorCode(error)).toBe('VALIDATION_ERROR')
    expect(getApiFieldErrors(error)).toEqual({
      customer_phone: [
        {
          code: 'INVALID_PHONE',
          message: 'رقم الهاتف غير صحيح',
        },
      ],
    })
    expect(getApiErrorDetails(error)).toEqual({ source: 'backend' })
    expect(getApiRequestId(error)).toBe('req-123')
    expect(
      getFirstFieldErrorMessage(
        getApiFieldErrors(error),
        'customer_phone',
      ),
    ).toBe('رقم الهاتف غير صحيح')
  })

  it('returns null for missing metadata', () => {
    expect(getApiErrorCode(new Error('plain'))).toBeNull()
    expect(getApiFieldErrors(new Error('plain'))).toBeNull()
    expect(getApiErrorDetails(new Error('plain'))).toBeNull()
    expect(getApiRequestId(new Error('plain'))).toBeNull()
    expect(getFirstFieldErrorMessage(null, 'amount')).toBeNull()
  })

  it.each([
    ['BOOKING_SLOT_UNAVAILABLE', 'المعاد مبقاش متاح. اختار ميعاد تاني.'],
    ['BOOKING_COMPLETION_REQUIRES_FULL_PAYMENT', 'لازم تحصّل المبلغ المتبقي قبل إكمال الحجز.'],
    ['RECURRENCE_CONTINUATION_DECISION_REQUIRED', 'اختار إذا كان الموعد الأسبوعي هيستمر ولا هيتوقف.'],
    ['BOOKING_RECURRENCE_NOT_ACTIVE', 'التكرار الأسبوعي للحجز ده مش نشط.'],
    ['RECURRING_BOOKING_RESCHEDULE_NOT_SUPPORTED', 'لتغيير المعاد الأسبوعي، أوقف التكرار الحالي واعمل حجز جديد.'],
    ['SELF_SETTLEMENT_APPROVAL_FORBIDDEN', 'مينفعش تسوي عهدتك بنفسك.'],
    ['NO_UNSETTLED_TRANSACTIONS', 'مفيش مبلغ غير مسوى للموظف ده دلوقتي.'],
  ])('maps stable code %s without parsing backend message text', (code, message) => {
    expect(
      getApiErrorMessage(new ApiClientError('English backend message', 409, { code })),
    ).toBe(message)
  })
})
