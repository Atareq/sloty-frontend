import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from '../../../core/auth/useAuth'
import { getCourt, updateCourt } from '../courtsApi'
import { SettingsCourtDetailsPage } from './SettingsCourtDetailsPage'

vi.mock('../../../core/auth/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../courtsApi', () => ({
  getCourt: vi.fn(),
  updateCourt: vi.fn(),
}))

vi.mock('../components/CourtWorkingHoursSection/CourtWorkingHoursSection', () => ({
  CourtWorkingHoursSection: ({ canEdit }: { canEdit: boolean }) => (
    <div>{canEdit ? 'can-edit-hours' : 'cannot-edit-hours'}</div>
  ),
}))

const mockedUseAuth = vi.mocked(useAuth)
const mockedGetCourt = vi.mocked(getCourt)
const mockedUpdateCourt = vi.mocked(updateCourt)

function mockManagerWithoutPermissions() {
  mockedUseAuth.mockReturnValue({
    accessToken: 'token',
    claims: { user_id: 1 },
    currentUser: null,
    selectedClubSlug: 'nasr-club',
    selectedMembership: {
      id: 10,
      role: 'MANAGER',
      club: {
        id: 1,
        name: 'نادي النصر',
        slug: 'nasr-club',
        city: 'ASSIUT',
        is_active: true,
      },
      court: null,
      can_change_pricing: false,
      can_manage_working_hours: false,
    },
    role: 'MANAGER',
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

function mockOwner() {
  mockManagerWithoutPermissions()
  const managerAuth = mockedUseAuth()

  mockedUseAuth.mockReturnValue({
    ...managerAuth,
    role: 'OWNER',
    selectedMembership: managerAuth.selectedMembership
      ? {
          ...managerAuth.selectedMembership,
          role: 'OWNER',
        }
      : null,
  })
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/settings/courts/7']}>
      <Routes>
        <Route
          element={<SettingsCourtDetailsPage />}
          path="/settings/courts/:courtId"
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('SettingsCourtDetailsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockManagerWithoutPermissions()
    mockedGetCourt.mockResolvedValue({
      id: 7,
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
    })
    mockedUpdateCourt.mockResolvedValue({
      id: 7,
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
    })
  })

  it('hides default price editing and shows policy and working-hours permissions', async () => {
    renderPage()

    expect(
      await screen.findByText('سياسة استرداد التأمين للعرض فقط في هذا الحساب.'),
    ).toBeInTheDocument()
    expect(screen.getByText('سياسة استرداد التأمين')).toBeInTheDocument()
    expect(
      screen.getByText('يسترد العميل التأمين عند الإلغاء قبل الموعد بـ'),
    ).toBeInTheDocument()
    const policyForm = screen.getByText('الحد الأدنى للعربون').closest('form')
    const refundField = screen.getByText('سياسة استرداد التأمين').closest('label')
    const refundInput = refundField?.querySelector('input')
    const helper = screen.getByText(
      'يسترد العميل التأمين عند الإلغاء قبل الموعد بـ',
    )
    expect(policyForm).toHaveClass('md:grid-cols-2', 'items-start')
    expect(refundField).toContainElement(helper)
    expect(refundInput).not.toBeNull()
    expect(
      Boolean(
        refundInput &&
          (refundInput.compareDocumentPosition(helper) &
            Node.DOCUMENT_POSITION_FOLLOWING),
      ),
    ).toBe(true)
    expect(screen.queryByText('سعر الفترة الواحدة')).not.toBeInTheDocument()
    expect(screen.getByText('cannot-edit-hours')).toBeInTheDocument()
  })

  it('loads and enables the digital payment reference setting for the owner', async () => {
    const user = userEvent.setup()
    mockOwner()
    renderPage()

    const checkbox = await screen.findByRole('checkbox', {
      name: /طلب مرجع الدفع للمدفوعات الإلكترونية/,
    })
    expect(checkbox).not.toBeChecked()
    expect(checkbox).toBeEnabled()
    expect(
      screen.getByText(
        'لو الإعداد ده مفعّل، لازم الموظف يكتب مرجع العملية عند الدفع بمحفظة إلكترونية أو تحويل بنكي.',
      ),
    ).toBeInTheDocument()

    await user.click(checkbox)
    await user.click(screen.getByRole('button', { name: 'حفظ سياسة الحجز' }))

    expect(mockedUpdateCourt).toHaveBeenCalledWith(
      'nasr-club',
      '7',
      expect.objectContaining({
        requires_digital_payment_reference: true,
      }),
    )
  })

  it('sends false when the owner turns the setting off', async () => {
    const user = userEvent.setup()
    mockOwner()
    mockedGetCourt.mockResolvedValueOnce({
      ...(await mockedGetCourt('nasr-club', '7')),
      requires_digital_payment_reference: true,
    })
    renderPage()

    const checkbox = await screen.findByRole('checkbox', {
      name: /طلب مرجع الدفع للمدفوعات الإلكترونية/,
    })
    expect(checkbox).toBeChecked()

    await user.click(checkbox)
    await user.click(screen.getByRole('button', { name: 'حفظ سياسة الحجز' }))

    expect(mockedUpdateCourt).toHaveBeenCalledWith(
      'nasr-club',
      '7',
      expect.objectContaining({
        requires_digital_payment_reference: false,
      }),
    )
  })
})
