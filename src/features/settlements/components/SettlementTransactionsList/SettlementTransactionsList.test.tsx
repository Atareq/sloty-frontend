import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { SettlementPreviewTransaction } from '../../settlements.types'
import { SettlementTransactionsList } from './SettlementTransactionsList'

const transactions: SettlementPreviewTransaction[] = [
  {
    id: 1,
    amount: '500.00',
    payment_method: 'CASH',
    transaction_type: 'PAYMENT',
    court_name: 'ملعب 1',
    created: '2026-07-19T15:20:00Z',
  },
  {
    id: 2,
    amount: '250.00',
    payment_method: 'DIGITAL_WALLET',
    payment_reference: 'wallet-123',
    transaction_type: 'REFUND',
    court_name: 'ملعب 2',
    created: '2026-07-19T16:20:00Z',
  },
]

describe('SettlementTransactionsList', () => {
  it('keeps related transactions collapsed by default', () => {
    render(<SettlementTransactionsList transactions={transactions} />)

    const trigger = screen.getByRole('button', {
      name: /المعاملات المرتبطة ▼\s*2/,
    })

    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('500.00 جنيه')).not.toBeInTheDocument()
    expect(screen.queryByText('ملعب 1')).not.toBeInTheDocument()
  })

  it('expands and collapses related transaction cards on demand', async () => {
    const user = userEvent.setup()

    render(<SettlementTransactionsList transactions={transactions} />)

    await user.click(screen.getByRole('button', {
      name: /المعاملات المرتبطة ▼\s*2/,
    }))

    expect(screen.getByRole('button', {
      name: /المعاملات المرتبطة ▲\s*2/,
    })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('500.00 جنيه')).toBeInTheDocument()
    expect(screen.getByText('250.00 جنيه')).toBeInTheDocument()
    expect(screen.getByText('ملعب 1')).toBeInTheDocument()
    expect(screen.getByText('wallet-123')).toBeInTheDocument()

    await user.click(screen.getByRole('button', {
      name: /المعاملات المرتبطة ▲\s*2/,
    }))

    expect(screen.getByRole('button', {
      name: /المعاملات المرتبطة ▼\s*2/,
    })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('500.00 جنيه')).not.toBeInTheDocument()
  })

  it('shows one related transaction after the user expands the section', async () => {
    const user = userEvent.setup()

    render(<SettlementTransactionsList transactions={[transactions[0]]} />)

    const trigger = screen.getByRole('button', {
      name: /المعاملات المرتبطة ▼\s*1/,
    })

    expect(trigger).toHaveClass('min-h-12', 'w-full')
    await user.click(trigger)

    expect(screen.getByRole('button', {
      name: /المعاملات المرتبطة ▲\s*1/,
    })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('500.00 جنيه')).toBeInTheDocument()
    expect(screen.getByText('ملعب 1')).toBeInTheDocument()
  })

  it('shows the empty message only after expanding an empty related section', async () => {
    const user = userEvent.setup()

    render(
      <SettlementTransactionsList
        emptyMessage="لا توجد عمليات داخل هذا الاستلام."
        transactions={[]}
      />,
    )

    expect(screen.getByRole('button', {
      name: /المعاملات المرتبطة ▼\s*0/,
    })).toHaveAttribute('aria-expanded', 'false')
    expect(
      screen.queryByText('لا توجد عمليات داخل هذا الاستلام.'),
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', {
      name: /المعاملات المرتبطة ▼\s*0/,
    }))

    expect(
      screen.getByText('لا توجد عمليات داخل هذا الاستلام.'),
    ).toBeInTheDocument()
  })
})
