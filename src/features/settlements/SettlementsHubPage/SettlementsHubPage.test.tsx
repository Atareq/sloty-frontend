import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiClientError } from '../../../core/api/apiClient'
import { useAuth } from '../../../core/auth/useAuth'
import { offlineRepositories } from '../../../offline/repositories/offlineRepositories'
import { listClubUsers } from '../../clubUsers/clubUsersApi'
import { listCourts } from '../../courts/courtsApi'
import {
  getCurrentCustodySummary,
  getSettlementPreview,
  listSettlements,
} from '../settlementsApi'
import { notifyCurrentFinancialStateChanged } from '../currentFinancialStateInvalidation'
import { SettlementsHubPage } from './SettlementsHubPage'

vi.mock('../../../core/auth/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../../clubUsers/clubUsersApi', () => ({
  listClubUsers: vi.fn(),
}))

vi.mock('../../courts/courtsApi', () => ({
  listCourts: vi.fn(),
}))

vi.mock('../settlementsApi', () => ({
  getCurrentCustodySummary: vi.fn(),
  getSettlementPreview: vi.fn(),
  listSettlements: vi.fn(),
}))

vi.mock('../../../offline/repositories/offlineRepositories', () => ({
  offlineRepositories: {
    deleteCurrentCustodySnapshot: vi.fn(),
    readCurrentCustodySnapshot: vi.fn(),
    replaceCurrentCustodySnapshot: vi.fn(),
  },
}))

const mockedUseAuth = vi.mocked(useAuth)
const mockedGetSettlementPreview = vi.mocked(getSettlementPreview)
const mockedListSettlements = vi.mocked(listSettlements)
const mockedListClubUsers = vi.mocked(listClubUsers)
const mockedListCourts = vi.mocked(listCourts)
const mockedGetCurrentCustodySummary = vi.mocked(getCurrentCustodySummary)
const mockedOfflineRepositories = vi.mocked(offlineRepositories)

const currentCustodySummary = {
  results: [
    {
      collected_by: 15,
      collected_by_name: 'أحمد محمد',
      period_start: '2026-08-15T10:00:00Z',
      period_end: '2026-08-16T11:00:00Z',
      transaction_count: 3,
      total_amount: '1250.00',
      net_amount: '1250.00',
      booking_payments: '1400.00',
      booking_refunds: '-150.00',
      totals_by_payment_method: {
        CASH: '400.00',
        DIGITAL_WALLET: '300.00',
        BANK_TRANSFER: '550.00',
      },
      is_self: false,
      can_approve: true,
    },
  ],
}

function mockAuth(role: 'OWNER' | 'MANAGER' | 'STAFF', canSettle = false) {
  mockedUseAuth.mockReturnValue({
    accessToken: 'token',
    claims: { user_id: 1 },
    currentUser: {
      id: 1,
      username: 'current-user',
      email: 'manager@example.com',
      first_name: 'Current',
      last_name: 'User',
      phone_number: null,
      is_active: true,
      is_platform_admin: false,
      account_created_by: null,
      requires_club_selection: false,
      memberships: [],
    },
    selectedClubSlug: 'nasr-club',
    selectedMembership: {
      id: 10,
      role,
      club: {
        id: 1,
        name: 'نادي النصر',
        slug: 'nasr-club',
        city: 'ASSIUT',
        is_active: true,
      },
      court: role === 'STAFF' ? { id: 7, name: 'ملعب 1' } : null,
      permissions: {
        can_change_pricing: false,
        can_manage_working_hours: false,
        can_manage_settlements: canSettle,
      },
    },
    role,
    isAuthenticated: true,
    isLoadingSession: false,
    isTokenExpired: false,
    sessionError: null,
    login: vi.fn(),
    logout: vi.fn(),
    selectClub: vi.fn(),
    clearSelectedClub: vi.fn(),
    refreshCurrentUser: vi.fn(),
    setTokens: vi.fn(),
  })
}

function renderHub(path = '/settlements') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <SettlementsHubPage />
    </MemoryRouter>,
  )
}

describe('SettlementsHubPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth('STAFF')
    mockedGetCurrentCustodySummary.mockResolvedValue(currentCustodySummary)
    mockedGetSettlementPreview.mockResolvedValue({
      club: 1,
      collected_by: 1,
      collected_by_name: 'أحمد علي',
      is_self_preview: true,
      can_approve: false,
      approval_required: true,
      period_start: '2026-08-16T10:00:00Z',
      period_end: '2026-08-16T11:00:00Z',
      transaction_count: 1,
      total_amount: '150.00',
      booking_payments: '150.00',
      booking_refunds: '0.00',
      net_amount: '150.00',
      totals_by_payment_method: { CASH: '150.00' },
      transactions: [
        {
          id: 20,
          booking: 5,
          amount: '150.00',
          payment_method: 'CASH',
          created: '2026-08-16T10:00:00Z',
        },
      ],
    })
    mockedOfflineRepositories.readCurrentCustodySnapshot.mockResolvedValue(
      undefined,
    )
    mockedOfflineRepositories.replaceCurrentCustodySnapshot.mockResolvedValue(
      undefined,
    )
    mockedOfflineRepositories.deleteCurrentCustodySnapshot.mockResolvedValue(
      undefined,
    )
    mockedListSettlements.mockResolvedValue({
      count: 0,
      next: null,
      previous: null,
      results: [],
    })
    mockedListClubUsers.mockResolvedValue({
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          id: 15,
          membership_id: 100,
          username: 'collector',
          first_name: 'أحمد',
          last_name: 'محمد',
          role: 'STAFF',
        },
      ],
    })
    mockedListCourts.mockResolvedValue({
      count: 2,
      next: null,
      previous: null,
      results: [
        {
          id: 3,
          club: 1,
          name: 'ملعب 1',
          sport_type: 'FOOTBALL',
          default_price: '300.00',
          minimum_deposit: '100.00',
          cancellation_refund_notice_days: 3,
          slot_duration_minutes: 60,
          is_active: true,
          requires_digital_payment_reference: false,
          internal_hold_expiry_hours: 12,
        },
        {
          id: 4,
          club: 1,
          name: 'ملعب 2',
          sport_type: 'FOOTBALL',
          default_price: '300.00',
          minimum_deposit: '100.00',
          cancellation_refund_notice_days: 3,
          slot_duration_minutes: 60,
          is_active: true,
          requires_digital_payment_reference: false,
          internal_hold_expiry_hours: 12,
        },
      ],
    })
  })

  it('loads staff own preview without collector filters or history by default', async () => {
    renderHub()

    expect(await screen.findByText('العهدة الحالية')).toBeInTheDocument()
    expect(await screen.findByText('أحمد علي')).toBeInTheDocument()
    expect(screen.queryByText('المبالغ مع الموظفين')).not.toBeInTheDocument()
    expect(screen.queryByText('استلام المبلغ')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /معاملاتي المالية/ }))
      .toHaveAttribute('href', '/transactions')
    await waitFor(() => {
      expect(mockedGetSettlementPreview).toHaveBeenCalledWith('nasr-club', {
        court: 7,
      })
    })
    expect(mockedListSettlements).not.toHaveBeenCalled()
    expect(mockedListClubUsers).not.toHaveBeenCalled()
    expect(mockedGetCurrentCustodySummary).not.toHaveBeenCalled()
  })

  it('defaults management to all employees and current money without picking a collector', async () => {
    mockAuth('MANAGER', true)

    renderHub()

    expect(await screen.findByText('المبالغ مع الموظفين')).toBeInTheDocument()
    expect(screen.getByText('مراجعة المبالغ المستلمة سابقًا')).toBeInTheDocument()
    expect(
      screen.getByText('المبالغ الموجودة مع الموظفين حاليًا'),
    ).toBeInTheDocument()
    expect(screen.getAllByText('كل الملاعب').length).toBeGreaterThan(0)
    expect(await screen.findByText('أحمد محمد')).toBeInTheDocument()
    expect(
      screen.getByText('المبلغ المستحق للتسليم: 1,250.00 ج.م'),
    ).toBeInTheDocument()
    expect(screen.getByText('3 معاملات')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'استلام المبلغ' }))
      .toBeInTheDocument()
    expect(screen.getByRole('link', { name: /عرض سجل المعاملات المالية/ }))
      .toHaveAttribute('href', '/transactions')
    expect(screen.queryByText('تم استلامها سابقًا')).not.toBeInTheDocument()
    expect(screen.queryByText('عرض المعاملات المرتبطة')).not.toBeInTheDocument()
    await waitFor(() => {
      expect(mockedGetCurrentCustodySummary).toHaveBeenCalledWith(
        'nasr-club',
        {},
      )
    })
    expect(mockedGetCurrentCustodySummary).toHaveBeenCalledTimes(1)
    expect(mockedGetSettlementPreview).not.toHaveBeenCalled()
    expect(mockedListSettlements).not.toHaveBeenCalled()
  })

  it('renders cached grouped current custody when the grouped request fails', async () => {
    mockAuth('MANAGER', true)
    mockedGetCurrentCustodySummary.mockRejectedValueOnce(
      new Error('network failed'),
    )
    mockedOfflineRepositories.readCurrentCustodySnapshot.mockResolvedValueOnce({
      scope_key: 'user:1:club:nasr-club',
      user_id: 1,
      club_slug: 'nasr-club',
      snapshot_kind: 'grouped_summary',
      collector_scope: 'all',
      collector_id: null,
      court_scope: 'all',
      court_id: null,
      payload: currentCustodySummary,
      synced_at: '2026-09-03T08:00:00.000Z',
    })

    renderHub()

    expect(
      await screen.findByText('المبلغ المستحق للتسليم: 1,250.00 ج.م'),
    ).toBeInTheDocument()
    expect(screen.queryByText('تعذر تحميل المبالغ الحالية'))
      .not.toBeInTheDocument()
    expect(screen.getByText(/بيانات محفوظة من آخر تحديث ناجح/))
      .toBeInTheDocument()
  })

  it('renders cached selected-collector preview when that preview request fails', async () => {
    mockAuth('MANAGER', true)
    mockedGetSettlementPreview.mockRejectedValueOnce(
      new Error('network failed'),
    )
    mockedOfflineRepositories.readCurrentCustodySnapshot.mockResolvedValueOnce({
      scope_key: 'user:1:club:nasr-club',
      user_id: 1,
      club_slug: 'nasr-club',
      snapshot_kind: 'preview',
      collector_scope: 'collector:15',
      collector_id: 15,
      court_scope: 'court:3',
      court_id: 3,
      payload: {
        club: 1,
        collected_by: 15,
        collected_by_name: 'أحمد محمد',
        court: 3,
        court_name: 'ملعب 1',
        is_self_preview: false,
        can_approve: true,
        approval_required: true,
        period_start: '2026-08-15T10:00:00Z',
        period_end: '2026-08-16T11:00:00Z',
        transaction_count: 3,
        total_amount: '1250.00',
        booking_payments: '1400.00',
        booking_refunds: '-150.00',
        net_amount: '1250.00',
        totals_by_payment_method: currentCustodySummary.results[0]
          .totals_by_payment_method,
        transactions: [],
      },
      synced_at: '2026-09-03T08:00:00.000Z',
    })

    renderHub('/settlements?collected_by=15&court=3')

    expect(
      await screen.findByText('المبلغ المستحق للتسليم: 1,250.00 ج.م'),
    ).toBeInTheDocument()
    expect(mockedOfflineRepositories.readCurrentCustodySnapshot)
      .toHaveBeenCalledWith(
        { userId: 1, clubSlug: 'nasr-club' },
        'preview',
        '15',
        '3',
      )
  })

  it('does not prefetch one preview per employee on the management screen', async () => {
    const user = userEvent.setup()
    mockAuth('OWNER', true)
    const rows = Array.from({ length: 30 }, (_, index) => ({
      ...currentCustodySummary.results[0],
      collected_by: index + 10,
      collected_by_name: `موظف ${index + 1}`,
      net_amount: `${100 + index}.00`,
      total_amount: `${100 + index}.00`,
    }))
    mockedGetCurrentCustodySummary.mockResolvedValueOnce({ results: rows })
    mockedListClubUsers.mockResolvedValueOnce({
      count: 30,
      next: null,
      previous: null,
      results: rows.map((row, index) => ({
        id: row.collected_by,
        membership_id: 200 + index,
        username: `employee-${index + 1}`,
        first_name: 'موظف',
        last_name: String(index + 1),
        role: 'STAFF',
      })),
    })
    mockedGetSettlementPreview.mockResolvedValueOnce({
      club: 1,
      collected_by: 10,
      collected_by_name: 'موظف 1',
      is_self_preview: false,
      can_approve: true,
      approval_required: false,
      period_start: '2026-08-16T10:00:00Z',
      period_end: '2026-08-16T11:00:00Z',
      transaction_count: 3,
      total_amount: '100.00',
      booking_payments: '100.00',
      booking_refunds: '0.00',
      net_amount: '100.00',
      totals_by_payment_method: { CASH: '100.00' },
      transactions: [],
    })

    renderHub()

    expect(await screen.findByText('موظف 1')).toBeInTheDocument()
    expect(mockedGetCurrentCustodySummary).toHaveBeenCalledTimes(1)
    expect(mockedGetSettlementPreview).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: /كل الموظفين/ }))
    await user.click(screen.getByRole('option', { name: 'موظف 1' }))

    await waitFor(() => {
      expect(mockedGetSettlementPreview).toHaveBeenCalledWith('nasr-club', {
        collected_by: '10',
      })
    })
    expect(mockedGetSettlementPreview).toHaveBeenCalledTimes(1)
    expect(mockedGetCurrentCustodySummary).toHaveBeenCalledTimes(1)
  })

  it('shows newer Backend preview truth when it drifts from the grouped summary', async () => {
    const user = userEvent.setup()
    mockAuth('OWNER', true)
    mockedGetSettlementPreview.mockResolvedValueOnce({
      club: 1,
      collected_by: 15,
      collected_by_name: 'أحمد محمد',
      is_self_preview: false,
      can_approve: true,
      approval_required: false,
      period_start: '2026-08-16T10:00:00Z',
      period_end: '2026-08-16T11:00:00Z',
      transaction_count: 4,
      total_amount: '1450.00',
      booking_payments: '1600.00',
      booking_refunds: '-150.00',
      net_amount: '1450.00',
      totals_by_payment_method: {
        CASH: '600.00',
        DIGITAL_WALLET: '300.00',
        BANK_TRANSFER: '550.00',
      },
      transactions: [],
    })

    renderHub()

    expect(
      await screen.findByText('المبلغ المستحق للتسليم: 1,250.00 ج.م'),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /كل الموظفين/ }))
    await user.click(screen.getByRole('option', { name: 'أحمد محمد' }))

    expect(
      await screen.findByText('المبلغ المستحق للتسليم: 1,450.00 ج.م'),
    ).toBeInTheDocument()
    expect(screen.getByText('4 معاملات')).toBeInTheDocument()
    expect(
      screen.queryByText('المبلغ المستحق للتسليم: 1,250.00 ج.م'),
    ).not.toBeInTheDocument()
  })

  it('refetches grouped current custody and visible history after settlement success invalidation', async () => {
    mockAuth('OWNER', true)
    mockedGetCurrentCustodySummary
      .mockResolvedValueOnce(currentCustodySummary)
      .mockResolvedValueOnce({
        results: [
          {
            ...currentCustodySummary.results[0],
            transaction_count: 4,
            total_amount: '1450.00',
            net_amount: '1450.00',
          },
        ],
      })
    mockedListSettlements
      .mockResolvedValueOnce({
        count: 0,
        next: null,
        previous: null,
        results: [],
      })
      .mockResolvedValueOnce({
        count: 1,
        next: null,
        previous: null,
        results: [
          {
            id: 99,
            collected_by: 15,
            collected_by_name: 'أحمد محمد',
            total_amount: '1250.00',
            transaction_count: 3,
            status: 'SETTLED',
          },
        ],
      })

    renderHub('/settlements?history=true')

    expect(
      await screen.findByText('المبلغ المستحق للتسليم: 1,250.00 ج.م'),
    ).toBeInTheDocument()
    expect(await screen.findByText('مفيش مبالغ مستلمة سابقًا مطابقة.'))
      .toBeInTheDocument()

    notifyCurrentFinancialStateChanged({
      clubSlug: 'nasr-club',
      reason: 'settlement-create',
    })

    expect(
      await screen.findByText('المبلغ المستحق للتسليم: 1,450.00 ج.م'),
    ).toBeInTheDocument()
    expect(await screen.findByText('عرض التفاصيل')).toBeInTheDocument()
    expect(mockedGetCurrentCustodySummary).toHaveBeenCalledTimes(2)
    expect(mockedListSettlements).toHaveBeenCalledTimes(2)
  })

  it('renders the same Backend custody amount for Owner money management', async () => {
    mockAuth('OWNER', true)

    renderHub()

    expect(
      await screen.findByText('المبلغ المستحق للتسليم: 1,250.00 ج.م'),
    ).toBeInTheDocument()
    expect(screen.getByText('أحمد محمد')).toBeInTheDocument()
    expect(mockedGetCurrentCustodySummary).toHaveBeenCalledWith(
      'nasr-club',
      {},
    )
    expect(mockedGetSettlementPreview).not.toHaveBeenCalled()
  })

  it('sends the selected court only after explicit narrowing and removes it for all courts', async () => {
    const user = userEvent.setup()
    mockAuth('OWNER', true)
    mockedGetCurrentCustodySummary
      .mockResolvedValueOnce({
        results: [
          {
            ...currentCustodySummary.results[0],
            net_amount: '1000.00',
            total_amount: '1000.00',
            booking_payments: '1000.00',
            booking_refunds: '0.00',
            totals_by_payment_method: {
              CASH: '700.00',
              DIGITAL_WALLET: '300.00',
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        results: [
          {
            ...currentCustodySummary.results[0],
            net_amount: '700.00',
            total_amount: '700.00',
            booking_payments: '700.00',
            booking_refunds: '0.00',
            totals_by_payment_method: {
              CASH: '700.00',
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        results: [
          {
            ...currentCustodySummary.results[0],
            net_amount: '1000.00',
            total_amount: '1000.00',
            booking_payments: '1000.00',
            booking_refunds: '0.00',
            totals_by_payment_method: {
              CASH: '700.00',
              DIGITAL_WALLET: '300.00',
            },
          },
        ],
      })

    renderHub()

    expect(
      await screen.findByText('المبلغ المستحق للتسليم: 1,000.00 ج.م'),
    ).toBeInTheDocument()
    expect(mockedGetCurrentCustodySummary.mock.calls[0]).toEqual([
      'nasr-club',
      {},
    ])

    await user.click(screen.getByRole('button', { name: /نطاق الملعب/ }))
    await user.click(screen.getByRole('option', { name: 'ملعب 1' }))

    expect(
      await screen.findByText('المبلغ المستحق للتسليم: 700.00 ج.م'),
    ).toBeInTheDocument()
    expect(mockedGetCurrentCustodySummary).toHaveBeenLastCalledWith(
      'nasr-club',
      { court: '3' },
    )

    await user.click(screen.getByRole('button', { name: /نطاق الملعب/ }))
    await user.click(screen.getByRole('option', { name: 'كل الملاعب' }))

    expect(
      await screen.findByText('المبلغ المستحق للتسليم: 1,000.00 ج.م'),
    ).toBeInTheDocument()
    expect(mockedGetCurrentCustodySummary).toHaveBeenLastCalledWith(
      'nasr-club',
      {},
    )
  })

  it('loads a selected employee preview with explicit court scope and no current period block', async () => {
    mockAuth('MANAGER', true)
    mockedGetSettlementPreview.mockResolvedValueOnce({
      club: 1,
      collected_by: 15,
      collected_by_name: 'منى سمير',
      court: null,
      court_name: null,
      is_self_preview: false,
      can_approve: true,
      approval_required: false,
      period_start: '2026-08-16T10:00:00Z',
      period_end: '2026-08-16T11:00:00Z',
      transaction_count: 1,
      total_amount: '700.00',
      booking_payments: '700.00',
      booking_refunds: '0.00',
      net_amount: '700.00',
      totals_by_payment_method: { CASH: '700.00' },
      transactions: [],
    })

    renderHub('/settlements?collected_by=15&court=3')

    expect(await screen.findByText('منى سمير')).toBeInTheDocument()
    expect(mockedGetSettlementPreview).toHaveBeenCalledWith('nasr-club', {
      collected_by: '15',
      court: '3',
    })
    expect(mockedGetCurrentCustodySummary).not.toHaveBeenCalled()
    expect(screen.getByRole('link', { name: 'استلام المبلغ' })).toHaveAttribute(
      'href',
      '/settlements/preview?collected_by=15&court=3',
    )
    expect(screen.queryByText('الفترة')).not.toBeInTheDocument()
  })

  it('keeps a zero-net employee visible when current transactions exist', async () => {
    mockAuth('MANAGER', true)
    mockedGetCurrentCustodySummary.mockResolvedValueOnce({
      results: [
        {
          ...currentCustodySummary.results[0],
          transaction_count: 2,
          net_amount: '0.00',
          total_amount: '0.00',
          booking_payments: '500.00',
          booking_refunds: '-500.00',
          totals_by_payment_method: {
            CASH: '0.00',
          },
        },
      ],
    })

    renderHub()

    expect(await screen.findByText('أحمد محمد')).toBeInTheDocument()
    expect(
      screen.getByText('صافي المبلغ المستحق حاليًا: 0 ج.م'),
    ).toBeInTheDocument()
    expect(
      screen.queryByText('لا توجد مبالغ مستحقة للتسليم حاليًا'),
    ).not.toBeInTheDocument()
  })

  it('preserves negative current custody values without hiding or normalizing them', async () => {
    mockAuth('MANAGER', true)
    mockedGetCurrentCustodySummary.mockResolvedValueOnce({
      results: [
        {
          ...currentCustodySummary.results[0],
          transaction_count: 1,
          net_amount: '-200.00',
          total_amount: '-200.00',
          booking_payments: '0.00',
          booking_refunds: '-200.00',
          totals_by_payment_method: {
            CASH: '-200.00',
          },
        },
      ],
    })

    renderHub()

    expect(await screen.findByText('أحمد محمد')).toBeInTheDocument()
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

  it('keeps linked preview transactions collapsed until the same card is expanded', async () => {
    const user = userEvent.setup()
    mockAuth('MANAGER', true)
    mockedGetSettlementPreview.mockResolvedValueOnce({
      club: 1,
      collected_by: 15,
      collected_by_name: 'أحمد محمد',
      is_self_preview: false,
      can_approve: true,
      approval_required: false,
      period_start: '2026-08-16T10:00:00Z',
      period_end: '2026-08-16T11:00:00Z',
      transaction_count: 1,
      total_amount: '150.00',
      booking_payments: '150.00',
      booking_refunds: '0.00',
      net_amount: '150.00',
      totals_by_payment_method: { CASH: '150.00' },
      transactions: [
        {
          id: 20,
          booking: 5,
          amount: '150.00',
          payment_method: 'CASH',
          created: '2026-08-16T10:00:00Z',
          payment_reference: 'IPN-1',
        },
      ],
    })

    renderHub('/settlements?collected_by=15')

    const expander = await screen.findByRole('button', {
      name: /عرض المعاملات المرتبطة \(1\)/,
    })
    expect(expander).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('IPN-1')).not.toBeInTheDocument()

    await user.click(expander)
    expect(expander).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('IPN-1')).toBeInTheDocument()
  })

  it('loads historical settled records only after the previous-receipts checkbox is applied', async () => {
    const user = userEvent.setup()
    mockAuth('OWNER', true)
    mockedListSettlements.mockResolvedValueOnce({
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          id: 9,
          collected_by: 15,
          collected_by_name: 'أحمد محمد',
          total_amount: '2000.00',
          transaction_count: 8,
          period_start: '2026-07-19T10:00:00Z',
          period_end: '2026-07-19T15:20:00Z',
          status: 'SETTLED',
          created_by: { id: 1, name: 'Owner User' },
          created: '2026-07-19T15:20:00Z',
        },
      ],
    })

    renderHub()
    await screen.findByText('أحمد محمد')
    await user.click(screen.getByRole('checkbox', {
      name: 'مراجعة المبالغ المستلمة سابقًا',
    }))

    expect(await screen.findByText('تم استلامها سابقًا')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'عرض التفاصيل' })).toHaveAttribute(
      'href',
      '/settlements/9',
    )
    await waitFor(() => {
      expect(mockedListSettlements).toHaveBeenCalledWith('nasr-club', {
        status: 'SETTLED',
      })
    })
  })

  it('shows the staff empty-custody state for NO_UNSETTLED_TRANSACTIONS', async () => {
    mockedGetSettlementPreview.mockRejectedValueOnce(
      new ApiClientError('No unsettled transactions', 404, {
        code: 'NO_UNSETTLED_TRANSACTIONS',
      }),
    )

    renderHub()

    expect(
      await screen.findByText('لا توجد مبالغ مستحقة للتسليم حاليًا'),
    ).toBeInTheDocument()
    expect(screen.queryByText('No unsettled transactions')).not.toBeInTheDocument()
  })

  it('does not offer the signed-in manager as a custody review target', async () => {
    mockAuth('MANAGER', true)
    mockedListClubUsers.mockResolvedValueOnce({
      count: 2,
      next: null,
      previous: null,
      results: [
        {
          id: 1,
          membership_id: 99,
          username: 'current-user',
          first_name: 'Current',
          last_name: 'User',
          role: 'MANAGER',
        },
        {
          id: 15,
          membership_id: 100,
          username: 'collector',
          first_name: 'أحمد',
          last_name: 'محمد',
          role: 'STAFF',
        },
      ],
    })

    renderHub()

    expect(await screen.findByText('المبالغ مع الموظفين')).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: /كل الموظفين/ }))
    expect(screen.queryByRole('option', { name: 'Current User' }))
      .not.toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'كل الموظفين' }))
      .toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'أحمد محمد' }))
      .toBeInTheDocument()
  })
})
