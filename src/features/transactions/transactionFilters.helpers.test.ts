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

  it('hides cancellation for refund transactions', () => {
    const state = getTransactionCancelState(
      { ...baseTransaction, transaction_type: 'REFUND', amount: '-100.00' },
      { role: 'OWNER', currentUserId: 1 },
    )
    expect(state.isHidden).toBe(true)
    expect(state.canCancel).toBe(false)
  })

  it('hides cancellation for already cancelled transactions', () => {
    const state = getTransactionCancelState(
      { ...baseTransaction, is_cancelled: true },
      { role: 'OWNER', currentUserId: 1 },
    )
    expect(state.isHidden).toBe(true)
    expect(state.canCancel).toBe(false)
  })

  it('hides cancellation when offline', () => {
    const state = getTransactionCancelState(baseTransaction, {
      role: 'OWNER',
      currentUserId: 1,
      isOffline: true,
    })
    expect(state.isHidden).toBe(true)
    expect(state.canCancel).toBe(false)
  })

  it('disables cancellation with message when settled', () => {
    const state = getTransactionCancelState(
      { ...baseTransaction, is_settled: true },
      { role: 'OWNER', currentUserId: 1 },
    )
    expect(state.isHidden).toBe(false)
    expect(state.canCancel).toBe(false)
    expect(state.disabledReason).toContain('تم استلام هذه المعاملة')
  })

  it('allows owner to cancel any unsettled payment', () => {
    const state = getTransactionCancelState(baseTransaction, {
      role: 'OWNER',
      currentUserId: 1,
    })
    expect(state.isHidden).toBe(false)
    expect(state.canCancel).toBe(true)
  })

  it('allows staff to cancel their own collection', () => {
    const state = getTransactionCancelState(baseTransaction, {
      role: 'STAFF',
      currentUserId: 10,
    })
    expect(state.isHidden).toBe(false)
    expect(state.canCancel).toBe(true)
  })

  it('disables cancellation for staff when not the collector', () => {
    const state = getTransactionCancelState(baseTransaction, {
      role: 'STAFF',
      currentUserId: 20,
    })
    expect(state.isHidden).toBe(false)
    expect(state.canCancel).toBe(false)
    expect(state.disabledReason).toContain('يمكن للموظف إلغاء معاملاته فقط')
  })
})

