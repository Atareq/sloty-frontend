import { describe, expect, it } from 'vitest'
import type { Transaction } from '../../features/transactions/transactions.types'
import { getOfflineTransactionsView } from './offlineTransactionFilters'

function createTransaction(
  id: number,
  overrides: Partial<Transaction> = {},
): Transaction {
  return {
    id,
    booking: id,
    amount: '100.00',
    payment_method: 'CASH',
    created: `2026-08-${String(24 + id).padStart(2, '0')}T18:05:00+03:00`,
    court: 7,
    created_by: 15,
    is_cancelled: false,
    is_settled: false,
    ...overrides,
  }
}

const now = new Date('2026-08-30T09:00:00+03:00')

describe('getOfflineTransactionsView', () => {
  it('filters by safe cached fields and sorts newest first', () => {
    const view = getOfflineTransactionsView(
      [
        createTransaction(1, {
          created: '2026-08-24T18:05:00+03:00',
          payment_method: 'CASH',
          payment_reference: null,
          court: 7,
          is_cancelled: false,
          is_settled: false,
        }),
        createTransaction(2, {
          created: '2026-08-30T18:05:00+03:00',
          payment_method: 'DIGITAL_WALLET',
          payment_reference: 'WALLET-222',
          court: 8,
          created_by: { id: 20, name: 'محصل' },
          is_cancelled: true,
          is_settled: true,
        }),
      ],
      {
        court: 8,
        created_by: 20,
        is_cancelled: 'true',
        payment_method: 'DIGITAL_WALLET',
        search: 'wallet',
        settlement_status: 'settled',
      },
      now,
    )

    expect(view.state).toBe('ready')
    expect(view.transactions.map((transaction) => transaction.id)).toEqual([2])
  })

  it('searches payment reference without pretending customer fields are available', () => {
    const view = getOfflineTransactionsView(
      [
        createTransaction(1, {
          notes: 'أحمد دفع',
          payment_reference: 'PAY-123',
        }),
      ],
      { search: 'أحمد' },
      now,
    )

    expect(view.state).toBe('ready')
    expect(view.transactions).toEqual([])

    expect(
      getOfflineTransactionsView(
        [createTransaction(1, { payment_reference: 'PAY-123' })],
        { search: 'pay-123' },
        now,
      ).transactions,
    ).toHaveLength(1)
  })

  it('reports outside-window date ranges as Internet-required', () => {
    const view = getOfflineTransactionsView(
      [createTransaction(1)],
      { date_from: '2026-08-01', date_to: '2026-08-02' },
      now,
    )

    expect(view).toMatchObject({
      state: 'outside_window',
      transactions: [],
    })
  })

  it('sorts the complete cached dataset oldest first on request', () => {
    const view = getOfflineTransactionsView(
      [
        createTransaction(1, { created: '2026-08-30T18:05:00+03:00' }),
        createTransaction(2, { created: '2026-08-24T18:05:00+03:00' }),
      ],
      { sort: 'oldest' },
      now,
    )

    expect(view.transactions.map((transaction) => transaction.id)).toEqual([2, 1])
  })
})
