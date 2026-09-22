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
      { role: 'OWNER', currentProfileId: 1 },
    )
    expect(state.isHidden).toBe(true)
    expect(state.canCancel).toBe(false)
  })

  it('hides cancellation for already cancelled transactions', () => {
    const state = getTransactionCancelState(
      { ...baseTransaction, is_cancelled: true },
      { role: 'OWNER', currentProfileId: 1 },
    )
    expect(state.isHidden).toBe(true)
    expect(state.canCancel).toBe(false)
  })

  it('hides cancellation when offline', () => {
    const state = getTransactionCancelState(baseTransaction, {
      role: 'OWNER',
      currentProfileId: 1,
      isOffline: true,
    })
    expect(state.isHidden).toBe(true)
    expect(state.canCancel).toBe(false)
  })

  it('disables cancellation with message when settled', () => {
    const state = getTransactionCancelState(
      { ...baseTransaction, is_settled: true },
      { role: 'OWNER', currentProfileId: 1 },
    )
    expect(state.isHidden).toBe(false)
    expect(state.canCancel).toBe(false)
    expect(state.disabledReason).toContain('تم استلام هذه المعاملة')
  })

  it('allows owner to cancel any unsettled payment', () => {
    const state = getTransactionCancelState(baseTransaction, {
      role: 'OWNER',
      currentProfileId: 1,
    })
    expect(state.isHidden).toBe(false)
    expect(state.canCancel).toBe(true)
  })

  it('allows staff to cancel their own collection matching their operational profile ID', () => {
    const state = getTransactionCancelState(baseTransaction, {
      role: 'STAFF',
      currentProfileId: 10,
    })
    expect(state.isHidden).toBe(false)
    expect(state.canCancel).toBe(true)
  })

  it('disables cancellation for staff when not the collector', () => {
    const state = getTransactionCancelState(baseTransaction, {
      role: 'STAFF',
      currentProfileId: 20,
    })
    expect(state.isHidden).toBe(false)
    expect(state.canCancel).toBe(false)
    expect(state.disabledReason).toContain('يمكن للموظف إلغاء معاملاته فقط')
  })

  describe('regression: User ID is never used as Profile ID', () => {
    it('does not match when user ID matches created_by but operational profile ID differs', () => {
      // User account has ID 50, but operational Profile ID is 12.
      // Transaction was created by a profile with ID 50.
      const transactionCreatedByProfile50 = {
        ...baseTransaction,
        created_by: { id: 50, name: 'موظف آخر' },
      }

      // Comparison must NOT match on User.id (50); it must compare against currentProfileId (12).
      const state = getTransactionCancelState(transactionCreatedByProfile50, {
        role: 'STAFF',
        currentProfileId: 12,
      })

      expect(state.canCancel).toBe(false)
      expect(state.disabledReason).toContain('يمكن للموظف إلغاء معاملاته فقط')
    })

    it('matches when operational profile ID matches transaction created_by', () => {
      // User account has ID 50, Profile ID 12.
      // Transaction was created by Profile 12.
      const transactionCreatedByProfile12 = {
        ...baseTransaction,
        created_by: { id: 12, name: 'سارة' },
      }

      const state = getTransactionCancelState(transactionCreatedByProfile12, {
        role: 'STAFF',
        currentProfileId: 12,
      })

      expect(state.canCancel).toBe(true)
    })

    it('disables cancellation for staff when currentProfileId is missing or null', () => {
      const state = getTransactionCancelState(baseTransaction, {
        role: 'STAFF',
        currentProfileId: null,
      })

      expect(state.canCancel).toBe(false)
      expect(state.disabledReason).toContain('يمكن للموظف إلغاء معاملاته فقط')
    })
  })
})
