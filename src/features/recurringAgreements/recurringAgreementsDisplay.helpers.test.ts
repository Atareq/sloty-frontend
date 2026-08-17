import { describe, expect, it } from 'vitest'
import {
  getRecurringActionRequiredLabel,
  getRecurringAgreementStatusLabel,
  getRecurringCancellationReasonLabel,
  isAutoTerminatedRecurringAgreement,
} from './recurringAgreementsDisplay.helpers'

describe('recurringAgreementsDisplay helpers', () => {
  it('distinguishes automatic termination from ordinary cancelled agreements', () => {
    expect(
      isAutoTerminatedRecurringAgreement({
        status: 'CANCELLED',
        cancellation_reason: 'PREVIOUS_OCCURRENCE_NOT_COMPLETED',
      }),
    ).toBe(true)
    expect(
      getRecurringAgreementStatusLabel({
        status: 'CANCELLED',
        cancellation_reason: 'PREVIOUS_OCCURRENCE_NOT_COMPLETED',
      }),
    ).toBe('منتهي تلقائيًا')
    expect(
      getRecurringAgreementStatusLabel({
        status: 'CANCELLED',
        cancellation_reason: 'طلب العميل',
      }),
    ).toBe('ملغي')
  })

  it('formats known lifecycle reason and action-required codes', () => {
    expect(
      getRecurringCancellationReasonLabel(
        'PREVIOUS_OCCURRENCE_NOT_COMPLETED',
      ),
    ).toBe('عدم اكتمال الحجز الأسبوعي السابق في الوقت المحدد')
    expect(
      getRecurringActionRequiredLabel('OCCURRENCE_GENERATION_FAILED'),
    ).toBe('تعذر إنشاء أحد حجوزات الأسبوعية')
    expect(getRecurringActionRequiredLabel('')).toBe(
      'يحتاج مراجعة من المسؤول',
    )
  })
})
