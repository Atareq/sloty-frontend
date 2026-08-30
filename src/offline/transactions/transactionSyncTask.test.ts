import { describe, expect, it, vi } from 'vitest'
import type { CurrentUserMembership } from '../../core/auth/auth.types'
import type { Transaction } from '../../features/transactions/transactions.types'
import { createOfflineScopeKey } from '../scope/offlineScope'
import { createTransactionSyncTask } from './transactionSyncTask'

const staffMembership: CurrentUserMembership = {
  id: 10,
  role: 'STAFF',
  club: {
    id: 1,
    slug: 'nasr-club',
    name: 'نادي النصر',
    is_active: true,
  },
  court: { id: 7, name: 'ملعب 1' },
}

const managerMembership: CurrentUserMembership = {
  ...staffMembership,
  id: 11,
  role: 'MANAGER',
  court: null,
}

function createContext(membership = managerMembership) {
  const scope = { userId: 1, clubSlug: 'nasr-club' }

  return {
    ...scope,
    scopeKey: createOfflineScopeKey(scope),
    role: membership.role,
    membership,
    membershipId: membership.id,
    assignedCourtId: membership.court?.id ?? null,
    assignedCourtName: membership.court?.name ?? null,
  }
}

function createTransaction(id: number): Transaction {
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
  }
}

describe('createTransactionSyncTask', () => {
  it('requests the previous 7 calendar days for the current selected Club scope', async () => {
    const committed: Transaction[][] = []
    const listTransactions = vi.fn(async () => ({
      count: 1,
      next: null,
      previous: null,
      results: [createTransaction(1)],
    }))
    const task = createTransactionSyncTask({
      getNow: () => new Date('2026-08-30T09:00:00+03:00'),
      listTransactions,
      repositories: {
        replaceTransactionsSnapshot: async (_scope, transactions) => {
          committed.push(transactions)
        },
      },
    })

    const result = await task.run({
      operationalContext: createContext(),
      trigger: 'startup',
      signal: new AbortController().signal,
      startedAt: '2026-08-30T06:00:00.000Z',
    })

    expect(listTransactions).toHaveBeenCalledWith(
      'nasr-club',
      {
        date_from: '2026-08-24',
        date_to: '2026-08-30',
      },
      { signal: expect.any(AbortSignal) },
    )
    expect(committed[0]).toHaveLength(1)
    expect(result).toMatchObject({
      dataset: 'transactions',
      status: 'success',
      committedAt: '2026-08-30T06:00:00.000Z',
    })
  })

  it('keeps Staff synchronization limited to the assigned Court without creator filtering', async () => {
    const listTransactions = vi.fn(async () => ({
      count: 0,
      next: null,
      previous: null,
      results: [],
    }))
    const task = createTransactionSyncTask({
      getNow: () => new Date('2026-08-30T09:00:00+03:00'),
      listTransactions,
      repositories: {
        replaceTransactionsSnapshot: vi.fn(async () => undefined),
      },
    })

    await task.run({
      operationalContext: createContext(staffMembership),
      trigger: 'manual',
      signal: new AbortController().signal,
      startedAt: '2026-08-30T06:00:00.000Z',
    })

    expect(listTransactions).toHaveBeenCalledWith(
      'nasr-club',
      {
        court: 7,
        date_from: '2026-08-24',
        date_to: '2026-08-30',
      },
      { signal: expect.any(AbortSignal) },
    )
  })

  it('assembles all paginated pages before one atomic snapshot commit', async () => {
    const committed: Transaction[][] = []
    const listTransactions = vi
      .fn()
      .mockResolvedValueOnce({
        count: 3,
        next: '/transactions?page=2',
        previous: null,
        results: [createTransaction(1)],
      })
      .mockResolvedValueOnce({
        count: 3,
        next: '/transactions?page=3',
        previous: '/transactions',
        results: [createTransaction(2)],
      })
      .mockResolvedValueOnce({
        count: 3,
        next: null,
        previous: '/transactions?page=2',
        results: [createTransaction(3)],
      })
    const task = createTransactionSyncTask({
      getNow: () => new Date('2026-08-30T09:00:00+03:00'),
      listTransactions,
      repositories: {
        replaceTransactionsSnapshot: async (_scope, transactions) => {
          committed.push(transactions)
        },
      },
    })

    await task.run({
      operationalContext: createContext(),
      trigger: 'startup',
      signal: new AbortController().signal,
      startedAt: '2026-08-30T06:00:00.000Z',
    })

    expect(listTransactions).toHaveBeenNthCalledWith(
      1,
      'nasr-club',
      { date_from: '2026-08-24', date_to: '2026-08-30' },
      { signal: expect.any(AbortSignal) },
    )
    expect(listTransactions).toHaveBeenNthCalledWith(
      2,
      'nasr-club',
      { date_from: '2026-08-24', date_to: '2026-08-30', page: '2' },
      { signal: expect.any(AbortSignal) },
    )
    expect(listTransactions).toHaveBeenNthCalledWith(
      3,
      'nasr-club',
      { date_from: '2026-08-24', date_to: '2026-08-30', page: '3' },
      { signal: expect.any(AbortSignal) },
    )
    expect(committed).toHaveLength(1)
    expect(committed[0].map((transaction) => transaction.id)).toEqual([1, 2, 3])
  })

  it('does not commit partial pages when a later page fails', async () => {
    const replaceTransactionsSnapshot = vi.fn(async () => undefined)
    const listTransactions = vi
      .fn()
      .mockResolvedValueOnce({
        count: 3,
        next: '/transactions?page=2',
        previous: null,
        results: [createTransaction(1)],
      })
      .mockResolvedValueOnce({
        count: 3,
        next: '/transactions?page=3',
        previous: '/transactions',
        results: [createTransaction(2)],
      })
      .mockRejectedValueOnce(new Error('page 3 failed'))
    const task = createTransactionSyncTask({
      getNow: () => new Date('2026-08-30T09:00:00+03:00'),
      listTransactions,
      repositories: { replaceTransactionsSnapshot },
    })

    await expect(
      task.run({
        operationalContext: createContext(),
        trigger: 'startup',
        signal: new AbortController().signal,
        startedAt: '2026-08-30T06:00:00.000Z',
      }),
    ).rejects.toThrow('page 3 failed')

    expect(replaceTransactionsSnapshot).not.toHaveBeenCalled()
  })
})
