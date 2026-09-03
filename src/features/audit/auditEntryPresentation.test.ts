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
        { label: 'الحالة', value: 'العربون مدفوع' },
        { label: 'نوع الحجز', value: 'أسبوعي' },
        { label: 'القيمة', value: '300.00 جنيه' },
      ]),
    )
    expect(presentation.summaryDetails).toEqual([
      { label: 'العميل', value: 'أحمد' },
      { label: 'الموعد', value: expect.stringContaining('8:00 م') },
      { label: 'الملعب', value: 'ملعب 1' },
    ])
    expect(presentation.changes).toEqual(
      expect.arrayContaining([
        { label: 'اسم العميل', before: 'أحمد', after: 'محمد' },
        { label: 'الحالة', before: 'بانتظار العربون', after: 'العربون مدفوع' },
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
    expect(presentation.summaryDetails).toEqual([
      { label: 'العميل', value: 'أحمد' },
      { label: 'المبلغ', value: '-250.00 جنيه · نقدي' },
    ])
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

  it('does not turn actor or court numeric IDs into primary Audit labels', () => {
    const presentation = getAuditEntryPresentation(
      entry({
        actor: 16,
        court: 7,
        metadata: {},
      }),
    )

    expect(presentation.actorLabel).toBeUndefined()
    expect(presentation.courtLabel).toBeUndefined()
  })

  it('uses backend summary fields when the list row omits full metadata', () => {
    const presentation = getAuditEntryPresentation(
      entry({
        action: 'SETTLEMENT_MARKED_SETTLED',
        actor_name: 'أحمد محمود',
        actor_name_source: 'EVENT_SNAPSHOT',
        summary: {
          collected_by_name: 'محمد أحمد',
          total_amount: '1250.00',
          transaction_count: 12,
          settled_by_name: 'أحمد محمود',
        },
      }),
    )

    expect(presentation.actorLabel).toBe('أحمد محمود')
    expect(presentation.summaryDetails).toEqual([
      { label: 'الموظف', value: 'محمد أحمد' },
      { label: 'المبلغ', value: '1,250.00 جنيه' },
      { label: 'عدد المعاملات', value: '12' },
    ])
  })

  it('suppresses backend current-relation fallback names as historical truth', () => {
    const presentation = getAuditEntryPresentation(
      entry({
        actor_name: 'اسم حالي',
        actor_name_source: 'CURRENT_RELATION_FALLBACK',
        court_name: 'ملعب حالي',
        court_name_source: 'CURRENT_RELATION_FALLBACK',
      }),
    )

    expect(presentation.actorLabel).toBeUndefined()
    expect(presentation.courtLabel).toBeUndefined()
  })
})
