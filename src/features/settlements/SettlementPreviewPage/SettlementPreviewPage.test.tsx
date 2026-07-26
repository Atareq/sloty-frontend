import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiClientError } from '../../../core/api/apiClient'
import { useAuth } from '../../../core/auth/useAuth'
import { createSettlement, getSettlementPreview } from '../settlementsApi'
import { SettlementPreviewPage } from './SettlementPreviewPage'

vi.mock('../../../core/auth/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../settlementsApi', () => ({
  createSettlement: vi.fn(),
  getSettlementPreview: vi.fn(),
}))

const mockedUseAuth = vi.mocked(useAuth)
const mockedCreateSettlement = vi.mocked(createSettlement)
const mockedGetSettlementPreview = vi.mocked(getSettlementPreview)
const refreshCurrentUser = vi.fn()

function mockAuth(
  role: 'OWNER' | 'MANAGER' | 'STAFF' = 'OWNER',
  selectedClubSlug: string | null = 'nasr-club',
) {
  mockedUseAuth.mockReturnValue({
    accessToken: 'token',
    claims: { user_id: 1 },
    currentUser: null,
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
      transaction_count: 2,
      total_amount: '700.00',
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
          reference: 'REF-2',
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
  })

  it('shows missing collected_by instruction state', async () => {
    renderPage('/settlements/preview')

    expect(
      await screen.findByText('اختر الموظف المحصل لمراجعة التسوية.'),
    ).toBeInTheDocument()
    expect(screen.getByText('العودة إلى التسويات').closest('a')).toHaveAttribute(
      'href',
      '/settlements',
    )
    expect(mockedGetSettlementPreview).not.toHaveBeenCalled()
  })

  it('shows no selected club message', async () => {
    mockAuth('OWNER', null)

    renderPage()

    expect(
      await screen.findByText('اختر ناديًا أولًا لمراجعة التسوية'),
    ).toBeInTheDocument()
    expect(mockedGetSettlementPreview).not.toHaveBeenCalled()
  })

  it('blocks users without settlement permission', async () => {
    mockAuth('STAFF')

    renderPage()

    expect(
      await screen.findByText('ليس لديك صلاحية إنشاء التسويات.'),
    ).toBeInTheDocument()
    expect(mockedGetSettlementPreview).not.toHaveBeenCalled()
  })

  it('loads preview from URL params and renders review sections', async () => {
    renderPage('/settlements/preview?collected_by=15&court=3')

    expect(await screen.findByText('مراجعة التسوية')).toBeInTheDocument()
    expect(mockedGetSettlementPreview).toHaveBeenCalledWith('nasr-club', {
      collected_by: '15',
      court: '3',
    })
    expect(screen.getAllByText('أحمد المحصل')).not.toHaveLength(0)
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('700.00 جنيه')).toBeInTheDocument()
    expect(screen.getByText('تفصيل طرق الدفع')).toBeInTheDocument()
    expect(screen.getAllByText('500.00 جنيه')).not.toHaveLength(0)
    expect(screen.getAllByText('كاش')).not.toHaveLength(0)
    expect(screen.getAllByText('محفظة إلكترونية')).not.toHaveLength(0)
    expect(screen.getByText('الدفعات غير المسواة')).toBeInTheDocument()
    expect(screen.getByText('حجز #123')).toBeInTheDocument()
    expect(screen.getAllByText('رقم العملية')).not.toHaveLength(0)
    expect(screen.getByText('REF-1')).toBeInTheDocument()
  })

  it('shows friendly empty state for zero transactions', async () => {
    mockedGetSettlementPreview.mockResolvedValueOnce({
      club: 1,
      collected_by: 15,
      collected_by_name: 'أحمد المحصل',
      transaction_count: 0,
      total_amount: '0.00',
      totals_by_payment_method: {},
      transactions: [],
    })

    renderPage()

    expect(
      await screen.findByText('لا توجد معاملات غير مسواة لهذا الموظف'),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'تأكيد التسوية' }),
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
      await screen.findByText('لا توجد دفعات غير مسواة حالياً لهذا الموظف'),
    ).toBeInTheDocument()
    expect(screen.queryByText('No unsettled transactions')).not.toBeInTheDocument()
  })

  it('opens confirmation dialog and confirms with collected_by, court, and notes', async () => {
    const user = userEvent.setup()

    renderPage('/settlements/preview?collected_by=15&court=3')

    await user.click(await screen.findByRole('button', { name: 'تأكيد التسوية' }))
    const dialog = screen.getByRole('dialog')

    expect(dialog).toBeInTheDocument()
    expect(screen.getAllByText('تأكيد التسوية')).not.toHaveLength(0)
    expect(within(dialog).getByText(/أحمد المحصل/)).toBeInTheDocument()
    expect(within(dialog).getByText(/700.00 جنيه/)).toBeInTheDocument()
    expect(within(dialog).getByText('عدد الدفعات: 2')).toBeInTheDocument()

    await user.type(screen.getByLabelText('ملاحظات اختيارية'), 'مراجعة الوردية')
    await user.click(screen.getAllByRole('button', { name: 'تأكيد التسوية' })[1])

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

    await user.click(await screen.findByRole('button', { name: 'تأكيد التسوية' }))
    await user.click(screen.getAllByRole('button', { name: 'تأكيد التسوية' })[1])

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
        transaction_count: 2,
        total_amount: '700.00',
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
        transaction_count: 0,
        total_amount: '0.00',
        totals_by_payment_method: {},
        transactions: [],
      })

    renderPage()

    await user.click(await screen.findByRole('button', { name: 'تأكيد التسوية' }))
    await user.click(screen.getAllByRole('button', { name: 'تأكيد التسوية' })[1])

    expect(
      await screen.findByText('لا توجد معاملات غير مسواة لهذا الموظف'),
    ).toBeInTheDocument()
    expect(mockedGetSettlementPreview).toHaveBeenCalledTimes(2)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByText('Already settled')).not.toBeInTheDocument()
  })

  it('shows 403 confirmation error, refreshes current user, and does not retry', async () => {
    const user = userEvent.setup()

    mockedCreateSettlement.mockRejectedValueOnce(
      new ApiClientError('ليس لديك صلاحية لهذا الإجراء.', 403),
    )

    renderPage()

    await user.click(await screen.findByRole('button', { name: 'تأكيد التسوية' }))
    await user.click(screen.getAllByRole('button', { name: 'تأكيد التسوية' })[1])

    expect(
      await screen.findByText('ليس لديك صلاحية لهذا الإجراء.'),
    ).toBeInTheDocument()
    expect(refreshCurrentUser).toHaveBeenCalledTimes(1)
    expect(mockedCreateSettlement).toHaveBeenCalledTimes(1)
  })
})
