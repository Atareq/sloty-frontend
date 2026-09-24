import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { CurrentCustodySummaryRow } from '../../settlements.types'
import { CurrentCustodySection } from './CurrentCustodySection'

const baseRecord = {
  collected_by: 3,
  collected_by_name: 'Owner Tarek',
  period_start: '2026-07-20T10:00:00Z',
  period_end: '2026-07-21T10:00:00Z',
  transaction_count: 3,
  total_amount: '700.00',
  booking_payments: '700.00',
  booking_refunds: '0.00',
  net_amount: '700.00',
  totals_by_payment_method: {
    CASH: '400.00',
    DIGITAL_WALLET: '300.00',
  },
  can_approve: true,
  is_self: false,
}

function renderSection(
  records: CurrentCustodySummaryRow[],
) {
  return render(
    <MemoryRouter>
      <CurrentCustodySection mode="management" records={records} />
    </MemoryRouter>,
  )
}

describe('CurrentCustodySection', () => {
  it('shows Backend net amount and payment-method breakdown without recalculating totals', () => {
    renderSection([baseRecord])

    expect(screen.getByText('المحصل')).toBeInTheDocument()
    expect(screen.getByText('Owner Tarek')).toBeInTheDocument()
    expect(
      screen.getByText('المبلغ المستحق للتسليم: 700.00 ج.م'),
    ).toBeInTheDocument()
    expect(screen.getByText('3 معاملات')).toBeInTheDocument()
    expect(screen.getByText('نقدي')).toBeInTheDocument()
    expect(screen.getByText('400.00 ج.م')).toBeInTheDocument()
    expect(screen.getByText('محفظة إلكترونية')).toBeInTheDocument()
    expect(screen.getByText('300.00 ج.م')).toBeInTheDocument()
  })

  it('renders collector name using collected_by_name and links preview with collector ID', () => {
    renderSection([
      {
        ...baseRecord,
        collected_by: 3,
        collected_by_name: 'Owner Tarek',
        transaction_count: 2,
        net_amount: '400.00',
        totals_by_payment_method: {
          CASH: '400.00',
        },
        can_approve: true,
        is_self: true,
      },
    ])

    expect(screen.getByText('المحصل')).toBeInTheDocument()
    expect(screen.getByText('Owner Tarek')).toBeInTheDocument()
    const receiveLink = screen.getByRole('link', { name: 'استلام المبلغ' })
    expect(receiveLink).toHaveAttribute(
      'href',
      '/settlements/preview?collected_by=3',
    )
  })

  it('uses collected_by identity fields from unsettled-summary rows', () => {
    renderSection([
      {
        ...baseRecord,
        collected_by: 3,
        collected_by_name: 'Owner Tarek',
      },
    ])

    expect(screen.getByText('Owner Tarek')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'استلام المبلغ' })).toHaveAttribute(
      'href',
      '/settlements/preview?collected_by=3',
    )
  })

  it('keeps summary React keys and links on the collector identity', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/features/settlements/components/CurrentCustodySection/CurrentCustodySection.tsx'),
      'utf8',
    )

    expect(source).toContain('key={record.collected_by}')
    expect(source).toContain('record.collected_by')
    expect(source).toContain('collected_by_name')
    expect(source).not.toContain('collectorId ??')
    expect(source).not.toContain('?? record.net_amount')
  })

  it('keeps a zero-net employee visible when transactions exist', () => {
    renderSection([
      {
        ...baseRecord,
        transaction_count: 2,
        net_amount: '0.00',
        totals_by_payment_method: {
          CASH: '0.00',
        },
      },
    ])

    expect(screen.getByText('Owner Tarek')).toBeInTheDocument()
    expect(
      screen.getByText('صافي المبلغ المستحق حاليًا: 0 ج.م'),
    ).toBeInTheDocument()
    expect(
      screen.queryByText('لا توجد مبالغ مستحقة للتسليم حاليًا'),
    ).not.toBeInTheDocument()
  })

  it('preserves a negative Backend value without positive wording or hiding the employee', () => {
    renderSection([
      {
        ...baseRecord,
        net_amount: '-200.00',
        totals_by_payment_method: {
          CASH: '-200.00',
        },
      },
    ])

    expect(screen.getByText('Owner Tarek')).toBeInTheDocument()
    const negativeTotal = screen
      .getAllByText('-200.00 ج.م')
      .find((element) => element.getAttribute('data-custody-state') === 'negative')

    expect(negativeTotal).toHaveAttribute(
      'data-custody-state',
      'negative',
    )
    expect(
      screen.queryByText('المبلغ المستحق للتسليم: 200.00 ج.م'),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText('صافي المبلغ المستحق حاليًا: 0 ج.م'),
    ).not.toBeInTheDocument()
  })
})
