import { describe, expect, it } from 'vitest'
import type { AuditLogEntry } from './audit.types'
import { getAuditEntryPresentation } from './auditEntryPresentation'

function entry(overrides: Partial<AuditLogEntry>): AuditLogEntry {
  return {
    id: 1,
    action: 'BOOKING_CREATED',
    created: '2026-08-25T18:00:00Z',
    ...overrides,
  }
}

describe('getAuditEntryPresentation', () => {
  it('uses rich booking metadata and before/after changes without raw JSON', () => {
    const presentation = getAuditEntryPresentation(
      entry({
        action: 'BOOKING_UPDATED',
        actor_name: 'محمود',
        court_name: 'ملعب 1',
        metadata: {
          customer_name: 'أحمد',
          court_name: 'ملعب 1',
          start_date: '2026-08-25',
          start_time: '20:00:00',
          end_time: '21:00:00',
          status: 'CONFIRMED',
          source: 'RECURRING',
          total_price: '300.00',
        },
        before_data: {
          customer_name: 'أحمد',
          status: 'HOLD',
          password: 'secret',
        },
        after_data: {
          customer_name: 'محمد',
          status: 'CONFIRMED',
          password: 'changed',
        },
      }),
    )

    expect(presentation.actorLabel).toBe('محمود')
    expect(presentation.courtLabel).toBe('ملعب 1')
    expect(presentation.details).toEqual(
      expect.arrayContaining([
        { label: 'العميل', value: 'أحمد' },
        { label: 'الحالة', value: 'مؤكد' },
        { label: 'نوع الحجز', value: 'أسبوعي' },
        { label: 'القيمة', value: '300.00 جنيه' },
      ]),
    )
    expect(presentation.changes).toEqual(
      expect.arrayContaining([
        { label: 'اسم العميل', before: 'أحمد', after: 'محمد' },
        { label: 'الحالة', before: 'بانتظار العربون', after: 'مؤكد' },
      ]),
    )
    expect(presentation.changes).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'password' }),
      ]),
    )
  })

  it('presents TRANSACTION_CREATED refund as a signed customer refund', () => {
    const presentation = getAuditEntryPresentation(
      entry({
        action: 'TRANSACTION_CREATED',
        metadata: {
          transaction_type: 'REFUND',
          amount: '-250.00',
          payment_method: 'CASH',
          customer_name: 'أحمد',
        },
      }),
    )

    expect(presentation.title).toBe('تسجيل استرداد للعميل')
    expect(presentation.details).toEqual(
      expect.arrayContaining([
        { label: 'نوع المعاملة', value: 'استرداد' },
        { label: 'القيمة', value: '-250.00 جنيه' },
        { label: 'طريقة الدفع', value: 'نقدي' },
      ]),
    )
  })

  it('presents recurring auto-termination without adding a new status', () => {
    const presentation = getAuditEntryPresentation(
      entry({
        action: 'RECURRING_AGREEMENT_AUTO_TERMINATED',
        metadata: {
          recurring_agreement_id: 7,
          customer_name: 'أحمد',
          court_name: 'ملعب 1',
          cancellation_reason: 'PREVIOUS_OCCURRENCE_NOT_COMPLETED',
          deposit_status: 'FORFEITED',
          failed_occurrence_start: '2026-08-25T20:00:00Z',
        },
      }),
    )

    expect(presentation.title).toBe('تم إنهاء الحجز الأسبوعي تلقائيًا')
    expect(presentation.description).toBe(
      'تم إنهاء الحجز الأسبوعي تلقائيًا لعدم اكتمال الحجز السابق في الوقت المحدد.',
    )
    expect(presentation.details).toEqual(
      expect.arrayContaining([
        { label: 'حالة التأمين', value: 'تم احتجازه' },
        {
          label: 'سبب الإلغاء',
          value: 'عدم اكتمال الحجز الأسبوعي السابق في الوقت المحدد',
        },
      ]),
    )
  })
})
