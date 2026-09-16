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
    expect(getAuditActionLabel('HISTORICAL_UNKNOWN_EVENT')).toBe(
      'Historical Unknown Event',
    )
  })

  it('exposes an all-actions option plus known schema action options', () => {
    expect(auditActionOptions[0]).toEqual({
      value: '',
      label: 'كل الإجراءات',
    })
    expect(auditActionOptions).toEqual(
      expect.arrayContaining([
        { value: 'BOOKING_CREATED', label: 'إنشاء حجز' },
        { value: 'BOOKING_CANCELLED', label: 'إلغاء حجز' },
        { value: 'TRANSACTION_CREATED', label: 'تسجيل معاملة مالية' },
        { value: 'SETTLEMENT_CREATED', label: 'إنشاء تسوية' },
        { value: 'MEMBERSHIP_DELETED', label: 'حذف عضوية' },
      ]),
    )
  })

  it('does not include obsolete recurring actions in filter options', () => {
    const actionValues = auditActionOptions.map((opt) => opt.value)
    expect(actionValues).not.toContain('RECURRING_AGREEMENT_CREATED')
    expect(actionValues).not.toContain('RECURRING_AGREEMENT_CANCELLED')
    expect(actionValues).not.toContain('RECURRING_AGREEMENT_AUTO_TERMINATED')
    expect(actionValues).not.toContain('RECURRING_OCCURRENCE_GENERATED')
    expect(actionValues).not.toContain('RECURRING_GENERATION_FAILED')
  })
})
