import { describe, expect, it, vi } from 'vitest'
import type { CurrentUserMembership } from '../../core/auth/auth.types'
import type { CurrentCustodySummaryResponse } from '../../features/settlements/settlements.types'
import type { OperationalSyncContext } from '../sync/sync.types'
import { createCurrentCustodySyncTask } from './currentCustodySyncTask'

const ownerMembership: CurrentUserMembership = {
  id: 10,
  role: 'OWNER',
  club: {
    id: 1,
    slug: 'nasr-club',
    name: 'نادي النصر',
    is_active: true,
  },
  court: null,
}

const staffMembership: CurrentUserMembership = {
  ...ownerMembership,
  id: 11,
  role: 'STAFF',
  court: { id: 7, name: 'ملعب 1' },
}

function createContext(
  membership: CurrentUserMembership,
): OperationalSyncContext {
  return {
    userId: 1,
    clubSlug: 'nasr-club',
    scopeKey: 'user:1:club:nasr-club',
    role: membership.role,
    membership,
    membershipId: membership.id,
    assignedCourtId: membership.court?.id ?? null,
    assignedCourtName: membership.court?.name ?? null,
  }
}

describe('current custody sync task', () => {
  it('stores one grouped Backend summary for settlement managers without transaction reduction', async () => {
    const summary: CurrentCustodySummaryResponse = {
      results: [
        {
          collected_by: 15,
          collected_by_name: 'محمد علي',
          transaction_count: 3,
          net_amount: '1250.00',
          totals_by_payment_method: {
            CASH: '500.00',
            DIGITAL_WALLET: '750.00',
          },
          period_start: '2026-07-01T10:00:00+03:00',
          period_end: '2026-09-03T10:00:00+03:00',
          total_amount: '1400.00',
          booking_payments: '1400.00',
          booking_refunds: '-150.00',
          is_self: false,
          can_approve: true,
        },
      ],
    }
    const repositories = {
      replaceCurrentCustodySnapshot: vi.fn().mockResolvedValue(undefined),
    }
    const getCurrentCustodySummary = vi.fn().mockResolvedValue(summary)
    const getSettlementPreview = vi.fn()
    const task = createCurrentCustodySyncTask({
      repositories: repositories as never,
      getCurrentCustodySummary,
      getSettlementPreview,
    })

    const result = await task.run({
      operationalContext: createContext(ownerMembership),
      trigger: 'online',
      signal: new AbortController().signal,
      startedAt: '2026-09-03T08:00:00.000Z',
    })

    expect(result.status).toBe('success')
    expect(getCurrentCustodySummary).toHaveBeenCalledWith(
      'nasr-club',
      {},
      { signal: expect.any(AbortSignal) },
    )
    expect(getSettlementPreview).not.toHaveBeenCalled()
    expect(repositories.replaceCurrentCustodySnapshot).toHaveBeenCalledWith(
      expect.objectContaining({ clubSlug: 'nasr-club' }),
      {
        kind: 'grouped_summary',
        courtId: null,
        payload: summary,
      },
      '2026-09-03T08:00:00.000Z',
    )
  })

  it('stores one staff self-preview scoped to the assigned Court', async () => {
    const preview = {
      club: 1,
      collected_by: 1,
      collected_by_name: 'أحمد الموظف',
      court: 7,
      court_name: 'ملعب 1',
      is_self_preview: true,
      can_approve: false,
      approval_required: true,
      period_start: '2026-07-01T10:00:00+03:00',
      period_end: '2026-09-03T10:00:00+03:00',
      transaction_count: 1,
      total_amount: '900.00',
      booking_payments: '900.00',
      booking_refunds: '0.00',
      net_amount: '900.00',
      totals_by_payment_method: { CASH: '900.00' },
      transactions: [],
    }
    const repositories = {
      replaceCurrentCustodySnapshot: vi.fn().mockResolvedValue(undefined),
    }
    const getCurrentCustodySummary = vi.fn()
    const getSettlementPreview = vi.fn().mockResolvedValue(preview)
    const task = createCurrentCustodySyncTask({
      repositories: repositories as never,
      getCurrentCustodySummary,
      getSettlementPreview,
    })

    await task.run({
      operationalContext: createContext(staffMembership),
      trigger: 'online',
      signal: new AbortController().signal,
      startedAt: '2026-09-03T08:00:00.000Z',
    })

    expect(getSettlementPreview).toHaveBeenCalledWith(
      'nasr-club',
      { court: 7 },
      { signal: expect.any(AbortSignal) },
    )
    expect(getCurrentCustodySummary).not.toHaveBeenCalled()
    expect(repositories.replaceCurrentCustodySnapshot).toHaveBeenCalledWith(
      expect.objectContaining({ clubSlug: 'nasr-club' }),
      {
        kind: 'preview',
        courtId: 7,
        payload: preview,
      },
      '2026-09-03T08:00:00.000Z',
    )
  })
})
