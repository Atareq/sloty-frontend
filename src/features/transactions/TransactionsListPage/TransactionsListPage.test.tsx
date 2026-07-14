import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { listClubs } from '../../clubs/clubsApi'
import { listTransactions } from '../transactionsApi'
import { TransactionsListPage } from './TransactionsListPage'

vi.mock('../../clubs/clubsApi', () => ({
  listClubs: vi.fn(),
}))

vi.mock('../transactionsApi', () => ({
  listTransactions: vi.fn(),
}))

const mockedListClubs = vi.mocked(listClubs)
const mockedListTransactions = vi.mocked(listTransactions)

function paginatedResponse<T>(results: T[]) {
  return {
    count: results.length,
    next: null,
    previous: null,
    results,
  }
}

describe('TransactionsListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads transactions for the first active club', async () => {
    mockedListClubs.mockResolvedValueOnce(
      paginatedResponse([
        {
          id: 1,
          name: 'نادي النصر',
          slug: 'nasr-club',
          city: 'أسيوط',
          area: 'وسط البلد',
          is_active: true,
          manager_can_settle_transactions: false,
          manager_can_change_pricing: false,
        },
      ]),
    )
    mockedListTransactions.mockResolvedValueOnce(
      paginatedResponse([
        {
          id: 5,
          booking: 10,
          amount: '150.00',
          payment_method: 'DIGITAL_WALLET' as const,
          reference: 'REF-123',
          created: '2026-07-02T10:00:00Z',
        },
      ]),
    )

    render(<TransactionsListPage />)

    expect(await screen.findByText('150.00')).toBeInTheDocument()
    expect(screen.getByText('محفظة رقمية')).toBeInTheDocument()
    expect(screen.getByText('#10')).toBeInTheDocument()
    expect(screen.getByText('REF-123')).toBeInTheDocument()
    expect(mockedListTransactions).toHaveBeenCalledWith('nasr-club')
  })

  it('shows an empty state when the active club has no transactions', async () => {
    mockedListClubs.mockResolvedValueOnce(
      paginatedResponse([
        {
          id: 1,
          name: 'نادي النصر',
          slug: 'nasr-club',
          city: 'أسيوط',
          area: 'وسط البلد',
          is_active: true,
          manager_can_settle_transactions: false,
          manager_can_change_pricing: false,
        },
      ]),
    )
    mockedListTransactions.mockResolvedValueOnce(paginatedResponse([]))

    render(<TransactionsListPage />)

    expect(
      await screen.findByText('لا توجد معاملات مسجلة حتى الآن'),
    ).toBeInTheDocument()
  })
})
