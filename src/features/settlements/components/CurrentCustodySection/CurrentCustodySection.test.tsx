import { render, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { CurrentCustodySection } from './CurrentCustodySection'

const baseRecord = {
  collected_by: 15,
  collected_by_name: 'محمد أحمد',
  transaction_count: 3,
  net_amount: '700.00',
  totals_by_payment_method: {
    CASH: '400.00',
    DIGITAL_WALLET: '300.00',
  },
  can_approve: true,
  is_self: false,
}

function renderSection(
  records: ComponentProps<typeof CurrentCustodySection>['records'],
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

    expect(
      screen.getByText('المبلغ المستحق للتسليم: 700.00 ج.م'),
    ).toBeInTheDocument()
    expect(screen.getByText('3 معاملات')).toBeInTheDocument()
    expect(screen.getByText('نقدي')).toBeInTheDocument()
    expect(screen.getByText('400.00 ج.م')).toBeInTheDocument()
    expect(screen.getByText('محفظة إلكترونية')).toBeInTheDocument()
    expect(screen.getByText('300.00 ج.م')).toBeInTheDocument()
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

    expect(screen.getByText('محمد أحمد')).toBeInTheDocument()
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

    expect(screen.getByText('محمد أحمد')).toBeInTheDocument()
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
