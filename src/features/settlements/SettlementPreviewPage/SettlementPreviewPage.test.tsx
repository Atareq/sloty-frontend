import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiClientError } from '../../../core/api/apiClient'
import { useAuth } from '../../../core/auth/useAuth'
import { offlineRepositories } from '../../../offline/repositories/offlineRepositories'
import { createSettlement, getSettlementPreview } from '../settlementsApi'
import { SettlementPreviewPage } from './SettlementPreviewPage'

vi.mock('../../../core/auth/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../settlementsApi', () => ({
  createSettlement: vi.fn(),
  getSettlementPreview: vi.fn(),
}))

vi.mock('../../../offline/repositories/offlineRepositories', () => ({
  offlineRepositories: {
    replaceCurrentCustodySnapshot: vi.fn(),
  },
}))

const mockedUseAuth = vi.mocked(useAuth)
const mockedCreateSettlement = vi.mocked(createSettlement)
const mockedGetSettlementPreview = vi.mocked(getSettlementPreview)
const mockedOfflineRepositories = vi.mocked(offlineRepositories)
const refreshCurrentUser = vi.fn()

function mockAuth(
  role: 'OWNER' | 'MANAGER' | 'STAFF' = 'OWNER',
  selectedClubSlug: string | null = 'nasr-club',
) {
  mockedUseAuth.mockReturnValue({
    accessToken: 'token',
    claims: { user_id: 1 },
    currentUser: selectedClubSlug
      ? {
          id: 1,
          username: 'owner',
          email: '',
          first_name: 'محمد',
          last_name: 'أحمد',
          phone_number: null,
          is_active: true,
          is_platform_admin: false,
          account_created_by: null,
          requires_club_selection: false,
          memberships: [],
        }
      : null,
    selectedClubSlug,
    selectedMembership: selectedClubSlug
      ? {
          id: 10,
          role,
          club: {
            id: 1,
            name: 'نادي النصر',
            slug: selectedClubSlug,
            city: 'ASSIUT',
            is_active: true,
          },
          court: null,
          can_manage_settlements: role === 'MANAGER',
        }
      : null,
    role,
    isAuthenticated: true,
    isLoadingSession: false,
    isTokenExpired: false,
    sessionError: null,
    login: vi.fn(),
    logout: vi.fn(),
    selectClub: vi.fn(),
    clearSelectedClub: vi.fn(),
    refreshCurrentUser,
    setTokens: vi.fn(),
  })
}

function renderPage(initialEntry = '/settlements/preview?collected_by=15') {
  function LocationProbe() {
    const location = useLocation()

    return <span data-testid="location">{location.pathname}</span>
  }

  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <SettlementPreviewPage />
      <LocationProbe />
    </MemoryRouter>,
  )
}

describe('SettlementPreviewPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    refreshCurrentUser.mockReset()
    mockAuth()
    mockedGetSettlementPreview.mockResolvedValue({
      club: 1,
      collected_by: 15,
      collected_by_name: 'أحمد المحصل',
      court: 3,
      court_name: 'ملعب 3',
      is_self_preview: false,
      can_approve: true,
      approval_required: false,
      period_start: '2026-07-21T10:00:00Z',
      period_end: '2026-07-21T11:00:00Z',
      transaction_count: 2,
      total_amount: '700.00',
      booking_payments: '700.00',
      booking_refunds: '0.00',
      net_amount: '700.00',
      totals_by_payment_method: {
        CASH: '500.00',
        DIGITAL_WALLET: '200.00',
      },
      transactions: [
        {
          id: 11,
          booking: 123,
          court: 3,
          court_name: 'ملعب 3',
          amount: '500.00',
          payment_method: 'CASH',
          payment_reference: 'REF-1',
          created: '2026-07-21T10:00:00Z',
        },
        {
          id: 12,
          booking: null,
          court: 3,
          court_name: 'ملعب 3',
          amount: '200.00',
          payment_method: 'DIGITAL_WALLET',
          payment_reference: 'REF-2',
        },
      ],
    })
    mockedCreateSettlement.mockResolvedValue({
      id: 99,
      collected_by: 15,
      court: 3,
      total_amount: '700.00',
      transaction_count: 2,
    })
    mockedOfflineRepositories.replaceCurrentCustodySnapshot.mockResolvedValue(
      undefined,
    )
  })

  it('loads Backend own-preview when collected_by is omitted', async () => {
    renderPage('/settlements/preview')

    expect(await screen.findByText('الموظف المحصل')).toBeInTheDocument()
    expect(mockedGetSettlementPreview).toHaveBeenCalledWith('nasr-club', {})
  })

  it('persists a successful Backend preview as the current-custody snapshot', async () => {
    renderPage('/settlements/preview?collected_by=15&court=3')

    expect(await screen.findByText('الموظف المحصل')).toBeInTheDocument()
    expect(mockedOfflineRepositories.replaceCurrentCustodySnapshot)
      .toHaveBeenCalledWith(
        { userId: 1, clubSlug: 'nasr-club' },
        {
          kind: 'preview',
          collectorId: '15',
          courtId: '3',
          payload: expect.objectContaining({
            collected_by: 15,
            net_amount: '700.00',
            transaction_count: 2,
          }),
        },
        expect.any(String),
      )
  })

  it('shows no selected club message', async () => {
    mockAuth('OWNER', null)

    renderPage('/settlements/preview')

    expect(
      await screen.findByText('اختر ناديًا أولًا لمراجعة المبلغ'),
    ).toBeInTheDocument()
    expect(mockedGetSettlementPreview).not.toHaveBeenCalled()
  })

  it('allows Staff own-preview visibility but follows backend can_approve', async () => {
    mockAuth('STAFF')
    mockedGetSettlementPreview.mockResolvedValueOnce({
      club: 1,
      collected_by: 1,
      collected_by_name: 'أحمد الموظف',
      is_self_preview: true,
      can_approve: false,
      approval_required: true,
      period_start: '2026-07-21T10:00:00Z',
      period_end: '2026-07-21T11:00:00Z',
      transaction_count: 1,
      total_amount: '500.00',
      booking_payments: '500.00',
      booking_refunds: '0.00',
      net_amount: '500.00',
      totals_by_payment_method: { CASH: '500.00' },
      transactions: [
        {
          id: 11,
          amount: '500.00',
          payment_method: 'CASH',
        },
      ],
    })

    renderPage('/settlements/preview')

    expect(
      await screen.findByText(
        'المبلغ ده خاص بتحصيلاتك، ولازم يستلمه شخص عنده صلاحية الاستلام.',
      ),
    ).toBeInTheDocument()
    expect(mockedGetSettlementPreview).toHaveBeenCalledWith('nasr-club', {})
    expect(mockedCreateSettlement).not.toHaveBeenCalled()
  })

  it('loads preview from URL params and renders review sections', async () => {
    renderPage('/settlements/preview?collected_by=15&court=3')

    expect(await screen.findByText('الموظف المحصل')).toBeInTheDocument()
    expect(mockedGetSettlementPreview).toHaveBeenCalledWith('nasr-club', {
      collected_by: '15',
      court: '3',
    })
    expect(screen.getAllByText('أحمد المحصل')).not.toHaveLength(0)
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(
      screen.getByText('المبلغ المستحق للتسليم: 700.00 ج.م'),
    ).toBeInTheDocument()
    expect(screen.getByText('تفصيل طرق الدفع')).toBeInTheDocument()
    expect(screen.getAllByText('500.00 جنيه')).not.toHaveLength(0)
    expect(screen.getAllByText('نقدي')).not.toHaveLength(0)
    expect(screen.getAllByText('محفظة إلكترونية')).not.toHaveLength(0)
    expect(screen.getByText('المعاملات المرتبطة')).toBeInTheDocument()
    expect(screen.queryByText('حجز #123')).not.toBeInTheDocument()
    expect(screen.getAllByText('مرجع الدفع')).not.toHaveLength(0)
    expect(screen.queryByText('REF-1')).not.toBeInTheDocument()
    expect(screen.getByText('REF-2')).toBeInTheDocument()
  })

  it('shows friendly empty state for zero transactions', async () => {
    mockedGetSettlementPreview.mockResolvedValueOnce({
      club: 1,
      collected_by: 15,
      collected_by_name: 'أحمد المحصل',
      is_self_preview: false,
      can_approve: true,
      approval_required: false,
      period_start: '2026-07-21T10:00:00Z',
      period_end: '2026-07-21T11:00:00Z',
      transaction_count: 0,
      total_amount: '0.00',
      booking_payments: '0.00',
      booking_refunds: '0.00',
      net_amount: '0.00',
      totals_by_payment_method: {},
      transactions: [],
    })

    renderPage()

    expect(
      await screen.findByText('مفيش مبلغ حالي للموظف دلوقتي.'),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'تأكيد استلام المبلغ' }),
    ).not.toBeInTheDocument()
  })

  it('keeps zero-net preview visible when backend still returns transactions', async () => {
    mockedGetSettlementPreview.mockResolvedValueOnce({
      club: 1,
      collected_by: 15,
      collected_by_name: 'أحمد المحصل',
      is_self_preview: false,
      can_approve: true,
      approval_required: false,
      period_start: '2026-07-21T10:00:00Z',
      period_end: '2026-07-21T11:00:00Z',
      transaction_count: 2,
      total_amount: '0.00',
      booking_payments: '500.00',
      booking_refunds: '-500.00',
      net_amount: '0.00',
      totals_by_payment_method: { CASH: '0.00' },
      transactions: [
        {
          id: 11,
          amount: '500.00',
          payment_method: 'CASH',
        },
        {
          id: 12,
          amount: '-500.00',
          payment_method: 'CASH',
        },
      ],
    })

    renderPage()

    expect(
      await screen.findByText('صافي المبلغ المستحق حاليًا: 0 ج.م'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'تأكيد استلام المبلغ' }))
      .toBeInTheDocument()
    expect(
      screen.queryByText('لا توجد مبالغ مستحقة للتسليم حاليًا'),
    ).not.toBeInTheDocument()
  })

  it('preserves negative preview values without positive wording', async () => {
    mockedGetSettlementPreview.mockResolvedValueOnce({
      club: 1,
      collected_by: 15,
      collected_by_name: 'أحمد المحصل',
      is_self_preview: false,
      can_approve: false,
      approval_required: true,
      period_start: '2026-07-21T10:00:00Z',
      period_end: '2026-07-21T11:00:00Z',
      transaction_count: 1,
      total_amount: '-200.00',
      booking_payments: '0.00',
      booking_refunds: '-200.00',
      net_amount: '-200.00',
      totals_by_payment_method: { CASH: '-200.00' },
      transactions: [
        {
          id: 11,
          amount: '-200.00',
          payment_method: 'CASH',
        },
      ],
    })

    renderPage()

    expect(await screen.findByText('-200.00 ج.م')).toHaveAttribute(
      'data-custody-state',
      'negative',
    )
    expect(
      screen.queryByText('المبلغ المستحق للتسليم: 200.00 ج.م'),
    ).not.toBeInTheDocument()
  })

  it('keeps self previews read-only and never creates a settlement', async () => {
    mockedGetSettlementPreview.mockResolvedValueOnce({
      club: 1,
      collected_by: 1,
      collected_by_name: 'أحمد المحصل',
      court: 3,
      court_name: 'ملعب 3',
      is_self_preview: true,
      can_approve: false,
      approval_required: true,
      period_start: '2026-07-21T10:00:00Z',
      period_end: '2026-07-21T11:00:00Z',
      transaction_count: 1,
      total_amount: '500.00',
      booking_payments: '500.00',
      booking_refunds: '0.00',
      net_amount: '500.00',
      totals_by_payment_method: { CASH: '500.00' },
      transactions: [
        {
          id: 11,
          amount: '500.00',
          payment_method: 'CASH',
        },
      ],
    })

    renderPage('/settlements/preview?collected_by=1')

    expect(
      await screen.findByText(
        'المبلغ ده خاص بتحصيلاتك، ولازم يستلمه شخص عنده صلاحية الاستلام.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'تأكيد استلام المبلغ' }),
    ).not.toBeInTheDocument()
    expect(mockedCreateSettlement).not.toHaveBeenCalled()
  })

  it('allows self-preview confirmation when backend can_approve is true', async () => {
    mockedGetSettlementPreview.mockResolvedValueOnce({
      club: 1,
      collected_by: 1,
      collected_by_name: 'مالك النادي',
      is_self_preview: true,
      can_approve: true,
      approval_required: false,
      period_start: '2026-07-21T10:00:00Z',
      period_end: '2026-07-21T11:00:00Z',
      transaction_count: 1,
      total_amount: '500.00',
      booking_payments: '500.00',
      booking_refunds: '0.00',
      net_amount: '500.00',
      totals_by_payment_method: { CASH: '500.00' },
      transactions: [
        {
          id: 11,
          amount: '500.00',
          payment_method: 'CASH',
        },
      ],
    })

    renderPage('/settlements/preview?collected_by=1')

    expect(
      await screen.findByRole('button', { name: 'تأكيد استلام المبلغ' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByText(
        'المبلغ ده خاص بتحصيلاتك، ولازم يستلمه شخص عنده صلاحية الاستلام.',
      ),
    ).not.toBeInTheDocument()
  })

  it('normalizes no-unsettled backend errors into a friendly empty state', async () => {
    mockedGetSettlementPreview.mockRejectedValueOnce(
      new ApiClientError('No unsettled transactions', 404, {
        code: 'NO_UNSETTLED_TRANSACTIONS',
      }),
    )

    renderPage()

    expect(
      await screen.findByText('مفيش مبلغ حالي للموظف دلوقتي.'),
    ).toBeInTheDocument()
    expect(screen.queryByText('No unsettled transactions')).not.toBeInTheDocument()
  })

  it('opens confirmation dialog and confirms with collected_by, court, and notes', async () => {
    const user = userEvent.setup()

    renderPage('/settlements/preview?collected_by=15&court=3')

    await user.click(await screen.findByRole('button', { name: 'تأكيد استلام المبلغ' }))
    const dialog = screen.getByRole('dialog')

    expect(dialog).toBeInTheDocument()
    expect(screen.getAllByText('تأكيد استلام المبلغ')).not.toHaveLength(0)
    expect(within(dialog).getByText(/أحمد المحصل/)).toBeInTheDocument()
    expect(within(dialog).getByText(/700.00 جنيه/)).toBeInTheDocument()
    expect(within(dialog).getByText('عدد العمليات: 2')).toBeInTheDocument()

    await user.type(screen.getByLabelText('ملاحظات اختيارية'), 'مراجعة الوردية')
    await user.click(screen.getAllByRole('button', { name: 'تأكيد استلام المبلغ' })[1])

    expect(mockedCreateSettlement).toHaveBeenCalledWith('nasr-club', {
      collected_by: 15,
      court: 3,
      notes: 'مراجعة الوردية',
    })
    expect(mockedCreateSettlement.mock.calls[0][1]).not.toHaveProperty('dry_run')
    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/settlements/99')
    })
  })

  it('redirects to settlements list when confirmation response has no id', async () => {
    const user = userEvent.setup()

    mockedCreateSettlement.mockResolvedValueOnce({ id: 0 })

    renderPage()

    await user.click(await screen.findByRole('button', { name: 'تأكيد استلام المبلغ' }))
    await user.click(screen.getAllByRole('button', { name: 'تأكيد استلام المبلغ' })[1])

    expect(await screen.findByTestId('location')).toHaveTextContent(
      '/settlements',
    )
  })

  it('handles no-unsettled confirmation concurrency as a friendly empty state', async () => {
    const user = userEvent.setup()

    mockedCreateSettlement.mockRejectedValueOnce(
      new ApiClientError('Already settled', 409, {
        code: 'SETTLEMENT_ALREADY_DONE',
      }),
    )
    mockedGetSettlementPreview
      .mockResolvedValueOnce({
        club: 1,
        collected_by: 15,
        collected_by_name: 'أحمد المحصل',
        is_self_preview: false,
        can_approve: true,
        approval_required: false,
        period_start: '2026-07-21T10:00:00Z',
        period_end: '2026-07-21T11:00:00Z',
        transaction_count: 2,
        total_amount: '700.00',
        booking_payments: '700.00',
        booking_refunds: '0.00',
        net_amount: '700.00',
        totals_by_payment_method: {
          CASH: '700.00',
        },
        transactions: [
          {
            id: 11,
            amount: '700.00',
            payment_method: 'CASH',
          },
        ],
      })
      .mockResolvedValueOnce({
        club: 1,
        collected_by: 15,
        collected_by_name: 'أحمد المحصل',
        is_self_preview: false,
        can_approve: true,
        approval_required: false,
        period_start: '2026-07-21T10:00:00Z',
        period_end: '2026-07-21T11:00:00Z',
        transaction_count: 0,
        total_amount: '0.00',
        booking_payments: '0.00',
        booking_refunds: '0.00',
        net_amount: '0.00',
        totals_by_payment_method: {},
        transactions: [],
      })

    renderPage()

    await user.click(await screen.findByRole('button', { name: 'تأكيد استلام المبلغ' }))
    await user.click(screen.getAllByRole('button', { name: 'تأكيد استلام المبلغ' })[1])

    expect(
      await screen.findByText('مفيش مبلغ حالي للموظف دلوقتي.'),
    ).toBeInTheDocument()
    expect(mockedGetSettlementPreview).toHaveBeenCalledTimes(2)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByText('Already settled')).not.toBeInTheDocument()
  })

  it('refetches and displays newer preview truth after a candidate-change create conflict', async () => {
    const user = userEvent.setup()

    mockedCreateSettlement.mockRejectedValueOnce(
      new ApiClientError('Candidate changed', 409, {
        code: 'SETTLEMENT_CONFLICT',
      }),
    )
    mockedGetSettlementPreview
      .mockResolvedValueOnce({
        club: 1,
        collected_by: 15,
        collected_by_name: 'أحمد المحصل',
        is_self_preview: false,
        can_approve: true,
        approval_required: false,
        period_start: '2026-07-21T10:00:00Z',
        period_end: '2026-07-21T11:00:00Z',
        transaction_count: 3,
        total_amount: '1250.00',
        booking_payments: '1400.00',
        booking_refunds: '-150.00',
        net_amount: '1250.00',
        totals_by_payment_method: {
          CASH: '400.00',
          DIGITAL_WALLET: '300.00',
          BANK_TRANSFER: '550.00',
        },
        transactions: [
          {
            id: 11,
            amount: '1250.00',
            payment_method: 'CASH',
          },
        ],
      })
      .mockResolvedValueOnce({
        club: 1,
        collected_by: 15,
        collected_by_name: 'أحمد المحصل',
        is_self_preview: false,
        can_approve: true,
        approval_required: false,
        period_start: '2026-07-21T10:00:00Z',
        period_end: '2026-07-21T11:01:00Z',
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
        transactions: [
          {
            id: 11,
            amount: '1250.00',
            payment_method: 'CASH',
          },
          {
            id: 12,
            amount: '200.00',
            payment_method: 'CASH',
          },
        ],
      })

    renderPage()

    expect(
      await screen.findByText('المبلغ المستحق للتسليم: 1,250.00 ج.م'),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'تأكيد استلام المبلغ' }))
    await user.click(screen.getAllByRole('button', {
      name: 'تأكيد استلام المبلغ',
    })[1])

    expect(
      await screen.findByText('المبلغ المستحق للتسليم: 1,450.00 ج.م'),
    ).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(mockedGetSettlementPreview).toHaveBeenCalledTimes(2)
    expect(screen.queryByText('Candidate changed')).not.toBeInTheDocument()
  })

  it('shows 403 confirmation error, refreshes current user, and does not retry', async () => {
    const user = userEvent.setup()

    mockedCreateSettlement.mockRejectedValueOnce(
      new ApiClientError('ليس لديك صلاحية لهذا الإجراء.', 403),
    )

    renderPage()

    await user.click(await screen.findByRole('button', { name: 'تأكيد استلام المبلغ' }))
    await user.click(screen.getAllByRole('button', { name: 'تأكيد استلام المبلغ' })[1])

    expect(
      await screen.findByText('ليس لديك صلاحية لهذا الإجراء.'),
    ).toBeInTheDocument()
    expect(refreshCurrentUser).toHaveBeenCalledTimes(1)
    expect(mockedCreateSettlement).toHaveBeenCalledTimes(1)
  })
})
