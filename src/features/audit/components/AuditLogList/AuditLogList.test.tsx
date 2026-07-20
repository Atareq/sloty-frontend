import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { AuditLogEntry } from '../../audit.types'
import {
  getAuditActionLabel,
  getAuditActionUiConfig,
} from '../../auditActionUi'
import { AuditLogList } from './AuditLogList'

function entry(overrides: Partial<AuditLogEntry>): AuditLogEntry {
  return {
    id: 1,
    action: 'BOOKING_CREATED',
    action_label: 'تم إنشاء حجز',
    actor: { id: 7, name: 'Owner Mahmoud' },
    message: 'تم إنشاء الحجز من لوحة الجدول',
    metadata: {
      booking_id: 12,
      customer_name: 'أحمد علي',
      court_name: 'ملعب 1',
    },
    created: '2026-07-19T10:30:00Z',
    ...overrides,
  }
}

function renderList(entries: AuditLogEntry[]) {
  render(<AuditLogList entries={entries} />)
}

function getCardByText(text: string): HTMLElement {
  const element = screen.getAllByText(text)[0]
  const card = element.closest('section')

  if (!card) {
    throw new Error(`Card not found for ${text}`)
  }

  return card
}

describe('audit action UI config', () => {
  it('selects semantic config from stable action codes', () => {
    expect(getAuditActionUiConfig('BOOKING_CREATED')).toMatchObject({
      foregroundClass: 'text-green-700',
      softBackgroundClass: 'bg-green-50',
      accentBorderClass: 'border-r-green-500',
    })
    expect(getAuditActionUiConfig('TRANSACTION_CANCELLED')).toMatchObject({
      foregroundClass: 'text-red-700',
      softBackgroundClass: 'bg-red-50',
      accentBorderClass: 'border-r-red-500',
    })
    expect(getAuditActionUiConfig('SETTLEMENT_CREATED')).toMatchObject({
      foregroundClass: 'text-indigo-700',
      softBackgroundClass: 'bg-indigo-50',
      accentBorderClass: 'border-r-indigo-500',
    })
    expect(getAuditActionUiConfig('UNKNOWN_ACTION')).toMatchObject({
      foregroundClass: 'text-slate-700',
      softBackgroundClass: 'bg-slate-100',
      accentBorderClass: 'border-r-slate-400',
    })
  })
})

describe('AuditLogList', () => {
  it('displays backend action_label and hides action code when label exists', () => {
    renderList([
      entry({
        action: 'TRANSACTION_CANCELLED',
        action_label: 'تم إلغاء دفعة',
      }),
    ])

    expect(screen.getAllByText('تم إلغاء دفعة')).toHaveLength(2)
    expect(screen.queryByText('TRANSACTION_CANCELLED')).not.toBeInTheDocument()
  })

  it('uses danger, positive, indigo, and neutral card styles', () => {
    renderList([
      entry({
        id: 1,
        action: 'TRANSACTION_CANCELLED',
        action_label: 'تم إلغاء دفعة',
      }),
      entry({
        id: 2,
        action: 'BOOKING_CREATED',
        action_label: 'تم إنشاء حجز',
      }),
      entry({
        id: 3,
        action: 'SETTLEMENT_CREATED',
        action_label: 'تم إنشاء تسوية',
      }),
      entry({
        id: 4,
        action: 'NEW_BACKEND_ACTION',
        action_label: 'إجراء جديد',
      }),
    ])

    expect(getCardByText('تم إلغاء دفعة')).toHaveClass('border-r-red-500')
    expect(getCardByText('تم إنشاء حجز')).toHaveClass('border-r-green-500')
    expect(getCardByText('تم إنشاء تسوية')).toHaveClass('border-r-indigo-500')
    expect(getCardByText('إجراء جديد')).toHaveClass('border-r-slate-400')
  })

  it('falls back for unknown actions and blank or missing labels', () => {
    expect(
      getAuditActionLabel(
        entry({
          action: 'BOOKING_UPDATED',
          action_label: '   ',
        }),
      ),
    ).toBe('تم تعديل حجز')
    expect(
      getAuditActionLabel(
        entry({
          action: 'UNKNOWN_ACTION',
          action_label: undefined,
        }),
      ),
    ).toBe('UNKNOWN_ACTION')

    renderList([
      entry({
        action: 'BOOKING_UPDATED',
        action_label: '   ',
      }),
      entry({
        id: 2,
        action: 'UNKNOWN_ACTION',
        action_label: undefined,
      }),
    ])

    expect(screen.getAllByText('تم تعديل حجز')).toHaveLength(2)
    expect(screen.getAllByText('UNKNOWN_ACTION')).toHaveLength(2)
  })

  it('filters metadata to safe useful primitive chips', () => {
    renderList([
      entry({
        metadata: {
          booking_id: 12,
          customer_name: 'أحمد علي',
          court_name: 'ملعب 1',
          payment_method: 'CASH',
          amount: '250.00',
          settlement_id: 9,
          ignored_null: null,
          internal_key: 'do-not-render',
          raw_object: { nested: true },
          raw_array: ['bad'],
        },
      }),
    ])

    expect(screen.getByText('الحجز')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('العميل')).toBeInTheDocument()
    expect(screen.getByText('أحمد علي')).toBeInTheDocument()
    expect(screen.getByText('طريقة الدفع')).toBeInTheDocument()
    expect(screen.getByText('نقدي')).toBeInTheDocument()
    expect(screen.getByText('المبلغ')).toBeInTheDocument()
    expect(screen.getByText('250.00')).toBeInTheDocument()
    expect(screen.getByText('التسوية')).toBeInTheDocument()
    expect(screen.getByText('9')).toBeInTheDocument()
    expect(screen.queryByText('ignored_null')).not.toBeInTheDocument()
    expect(screen.queryByText('internal_key')).not.toBeInTheDocument()
    expect(screen.queryByText('do-not-render')).not.toBeInTheDocument()
    expect(screen.queryByText('[object Object]')).not.toBeInTheDocument()
  })

  it('supports SETTLEMENT_MARKED_SETTLED as a positive action', () => {
    renderList([
      entry({
        action: 'SETTLEMENT_MARKED_SETTLED',
        action_label: 'تم تأكيد التسوية',
        metadata: { settlement_id: 9 },
      }),
    ])

    const card = getCardByText('تم تأكيد التسوية')

    expect(card).toHaveClass('border-r-green-500')
    expect(screen.getByText('التسوية')).toBeInTheDocument()
    expect(screen.getByText('9')).toBeInTheDocument()
  })

  it('uses action code for visuals regardless of Arabic or English labels', () => {
    renderList([
      entry({
        id: 1,
        action: 'BOOKING_CANCELLED',
        action_label: 'تم إلغاء الحجز',
      }),
      entry({
        id: 2,
        action: 'BOOKING_CANCELLED',
        action_label: 'Booking cancelled',
      }),
    ])

    expect(getCardByText('تم إلغاء الحجز')).toHaveClass('border-r-red-500')
    expect(getCardByText('Booking cancelled')).toHaveClass('border-r-red-500')
  })

  it('renders actor and semantic time element', () => {
    renderList([entry({})])

    expect(screen.getByText('Owner Mahmoud')).toBeInTheDocument()
    expect(screen.getByText('تم إنشاء الحجز من لوحة الجدول'))
      .toBeInTheDocument()

    const time = screen.getByText(/٢٠٢٦|2026/).closest('time')

    expect(time).toHaveAttribute('dateTime', '2026-07-19T10:30:00Z')
  })

  it('uses decorative icon circles with semantic classes', () => {
    renderList([
      entry({
        action: 'SETTLEMENT_CREATED',
        action_label: 'تم إنشاء تسوية',
      }),
    ])

    const card = getCardByText('تم إنشاء تسوية')
    const icon = within(card).getByText('#')

    expect(icon).toHaveAttribute('aria-hidden', 'true')
    expect(icon).toHaveClass('h-10', 'w-10', 'text-indigo-700', 'bg-indigo-50')
  })
})
