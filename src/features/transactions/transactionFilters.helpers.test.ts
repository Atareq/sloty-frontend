import { describe, expect, it } from 'vitest'
import { getTransactionCancelState } from './transactionFilters.helpers'

describe('getTransactionCancelState', () => {
  const baseTransaction = {
    id: 1,
    booking: 10,
    amount: '100.00',
    payment_method: 'CASH' as const,
    created_by: { id: 10, name: 'سارة' },
    is_cancelled: false,
    is_settled: false,
  }

  it('keeps cancellation available for refunds and lets the backend decide', () => {
    const state = getTransactionCancelState(
      { ...baseTransaction, transaction_type: 'REFUND', amount: '-100.00' },
      {},
    )
    expect(state).toEqual({ canCancel: true, isHidden: false })
  })

  it('keeps cancellation available for already cancelled rows returned by the backend', () => {
    const state = getTransactionCancelState(
      { ...baseTransaction, is_cancelled: true },
      {},
    )
    expect(state).toEqual({ canCancel: true, isHidden: false })
  })

  it('hides cancellation when offline', () => {
    const state = getTransactionCancelState(baseTransaction, {
      isOffline: true,
    })
    expect(state.isHidden).toBe(true)
    expect(state.canCancel).toBe(false)
  })

  it('hides cancellation for settled rows', () => {
    const state = getTransactionCancelState(
      { ...baseTransaction, is_settled: true },
      {},
    )
    expect(state).toEqual({ canCancel: false, isHidden: true })
  })

  it('does not inspect collector identity or role before allowing an online attempt', () => {
    const state = getTransactionCancelState(baseTransaction, {
      isOffline: false,
    })
    expect(state).toEqual({ canCancel: true, isHidden: false })
  })
})
