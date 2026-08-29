import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { financeCopy } from '../../../../shared/copy/appCopy'
import type { Transaction } from '../../transactions.types'
import { TransactionDetailsSheet } from './TransactionDetailsSheet'

const baseTransaction: Transaction = {
  id: 5,
  amount: '150.00',
  payment_method: 'DIGITAL_WALLET',
  payment_reference: 'REF-123',
  created: '2026-07-02T10:00:00Z',
  booking_start_time: '2026-07-02T11:00:00Z',
  booking_end_time: '2026-07-02T12:00:00Z',
  court_name: 'ملعب النجوم',
  created_by_username: 'collector',
}

describe('TransactionDetailsSheet', () => {
  it('shows notes from the hydrated detail object', () => {
    render(
      <TransactionDetailsSheet
        isOpen
        onClose={vi.fn()}
        transaction={{
          ...baseTransaction,
          notes: 'العميل حول المبلغ من رقم مختلف.',
        }}
        unsettledStateLabel={financeCopy.unsettledManagement}
      />,
    )

    expect(screen.getByText(financeCopy.transactionNotes)).toBeInTheDocument()
    expect(
      screen.getByText('العميل حول المبلغ من رقم مختلف.'),
    ).toBeInTheDocument()
    expect(screen.queryByText('غير متاح')).not.toBeInTheDocument()
  })

  it('hides the notes section when detail notes are empty or whitespace', () => {
    const { rerender } = render(
      <TransactionDetailsSheet
        isOpen
        onClose={vi.fn()}
        transaction={{ ...baseTransaction, notes: '   ' }}
        unsettledStateLabel={financeCopy.unsettledManagement}
      />,
    )

    expect(screen.queryByText(financeCopy.transactionNotes)).not.toBeInTheDocument()
    expect(screen.queryByText('غير متاح')).not.toBeInTheDocument()

    rerender(
      <TransactionDetailsSheet
        isOpen
        onClose={vi.fn()}
        transaction={{ ...baseTransaction, notes: null }}
        unsettledStateLabel={financeCopy.unsettledManagement}
      />,
    )

    expect(screen.queryByText(financeCopy.transactionNotes)).not.toBeInTheDocument()
  })

  it('shows a local loading state without treating a missing object as detail', () => {
    render(
      <TransactionDetailsSheet
        isLoading
        isOpen
        onClose={vi.fn()}
        transaction={null}
        unsettledStateLabel={financeCopy.unsettledManagement}
      />,
    )

    expect(
      screen.getByText(financeCopy.loadingTransactionDetail),
    ).toBeInTheDocument()
    expect(screen.queryByText(financeCopy.transactionNotes)).not.toBeInTheDocument()
  })
})
