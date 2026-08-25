import { describe, expect, it } from 'vitest'
import {
  auditActionOptions,
  getAuditActionLabel,
} from './auditActionLabels'

describe('audit action labels', () => {
  it('returns Arabic labels for known actions', () => {
    expect(getAuditActionLabel('BOOKING_CREATED')).toBe('إنشاء حجز')
    expect(getAuditActionLabel('TRANSACTION_CANCELLED')).toBe(
      'إلغاء معاملة مالية',
    )
    expect(getAuditActionLabel('SETTLEMENT_MARKED_SETTLED')).toBe(
      'تعليم التسوية كمكتملة',
    )
  })

  it('falls back safely for unknown actions', () => {
    expect(getAuditActionLabel('NEW_BACKEND_ACTION')).toBe(
      'New Backend Action',
    )
  })

  it('exposes an all-actions option plus known action options', () => {
    expect(auditActionOptions[0]).toEqual({
      value: '',
      label: 'كل الإجراءات',
    })
    expect(auditActionOptions).toEqual(
      expect.arrayContaining([
        { value: 'BOOKING_CREATED', label: 'إنشاء حجز' },
        {
          value: 'RECURRING_AGREEMENT_AUTO_TERMINATED',
          label: 'إنهاء الحجز الأسبوعي تلقائيًا',
        },
      ]),
    )
  })
})
