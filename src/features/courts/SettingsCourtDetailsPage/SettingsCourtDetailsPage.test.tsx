import { render, screen, within } from '@testing-library/react'
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

function mockOwner() {
  mockedUseAuth.mockReturnValue({
    accessToken: 'token',
    claims: { user_id: 1 },
    currentUser: null,
    selectedClubSlug: 'nasr-club',
    accessibleClubs: [],
    accessibleCourts: [],
    selectedCourtId: null,
    selectCourt: vi.fn(),
    role: 'OWNER',
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

function mockManagerWithoutPermissions() {
  mockedUseAuth.mockReturnValue({
    accessToken: 'token',
    claims: { user_id: 1 },
    currentUser: null,
    selectedClubSlug: 'nasr-club',
    accessibleClubs: [],
    accessibleCourts: [],
    selectedCourtId: null,
    selectCourt: vi.fn(),
    role: 'STAFF',
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
      minimum_deposit: '100.00',
      cancellation_refund_notice_days: 3,
      slot_duration_minutes: 60,
      is_active: true,
      requires_digital_payment_reference: false,
      internal_hold_expiry_hours: 12,
    })
  })

  it('renders booking/payment and cancellation/refund sections with units, helpers, and read-only state for managers', async () => {
    renderPage()

    // 1. Sections render
    expect(await screen.findByText('الحجز والدفع')).toBeInTheDocument()
    expect(screen.getByText('الإلغاء واسترداد العربون')).toBeInTheDocument()

    // 2. Minimum deposit label, unit, helper
    expect(screen.getByText('الحد الأدنى للعربون المطلوب')).toBeInTheDocument()
    const depositField = screen.getByText('الحد الأدنى للعربون المطلوب').closest('label')
    expect(depositField).not.toBeNull()
    expect(within(depositField!).getByText('ج.م')).toBeInTheDocument()
    expect(
      within(depositField!).getByText('أقل مبلغ مطلوب لتأكيد الحجز.'),
    ).toBeInTheDocument()
    const depositInput = depositField?.querySelector('input')
    expect(depositInput).toHaveValue('100.00')
    expect(depositInput).toBeDisabled()

    // 3. Hold expiry label, unit, helper
    expect(screen.getByText('مهلة دفع العربون')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /12 ساعة/ })).toBeInTheDocument()
    expect(
      screen.getByText(
        'يظل الحجز منتظرًا خلال هذه المدة. إذا لم يتم دفع العربون، يُلغى الحجز تلقائيًا.',
      ),
    ).toBeInTheDocument()

    // 4. Electronic payment reference label, helper
    expect(screen.getByText('طلب مرجع للدفع الإلكتروني')).toBeInTheDocument()
    expect(
      screen.getByText(
        'عند التفعيل، يجب إدخال مرجع العملية عند الدفع بمحفظة إلكترونية أو تحويل بنكي.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('checkbox')).toBeDisabled()

    // 5. Cancellation & refund label, placeholder, dynamic helper
    expect(screen.getByText('مدة السماح باسترداد العربون')).toBeInTheDocument()
    const refundField = screen.getByText('مدة السماح باسترداد العربون').closest('label')
    expect(refundField).not.toBeNull()
    const refundInput = refundField?.querySelector('input')
    expect(refundInput).toHaveAttribute('placeholder', 'أيام')
    expect(
      within(refundField!).getByText(
        'يحق للعميل استرداد العربون عند الإلغاء قبل موعد الحجز بـ 3 أيام أو أكثر.',
      ),
    ).toBeInTheDocument()
    expect(refundInput).toHaveValue(3)
    expect(refundInput).toBeDisabled()

    // 6. Read-only permissions notice (no التأمين)
    expect(
      screen.getByText('إعدادات الحجز للعرض فقط في هذا الحساب.'),
    ).toBeInTheDocument()

    // 7. No التأمين anywhere in this flow
    expect(screen.queryByText(/التأمين/)).not.toBeInTheDocument()
    expect(screen.queryByText('سعر الفترة الواحدة')).not.toBeInTheDocument()
    expect(screen.getByText('cannot-edit-hours')).toBeInTheDocument()
  })

  it('allows owner to edit settings with dynamic refund helper and saves with unchanged payload shape', async () => {
    mockOwner()
    const user = userEvent.setup()
    renderPage()

    expect(await screen.findByText('الحجز والدفع')).toBeInTheDocument()
    expect(screen.getByText('الإلغاء واسترداد العربون')).toBeInTheDocument()

    // Minimum deposit editing
    const depositField = screen.getByText('الحد الأدنى للعربون المطلوب').closest('label')
    const depositInput = depositField?.querySelector('input')
    expect(depositInput).not.toBeDisabled()
    await user.clear(depositInput!)
    await user.type(depositInput!, '150.00')

    // Hold expiry dropdown
    const holdExpiryButton = screen.getByRole('button', { name: /12 ساعة/ })
    await user.click(holdExpiryButton)
    const option24 = screen.getByRole('option', { name: '24 ساعة' })
    await user.click(option24)

    // Checkbox for digital payment reference
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).not.toBeChecked()
    await user.click(checkbox)
    expect(checkbox).toBeChecked()

    // Refund notice days input & dynamic helper
    const refundField = screen.getByText('مدة السماح باسترداد العربون').closest('label')
    const refundInput = refundField?.querySelector('input')
    expect(refundInput).not.toBeDisabled()
    expect(refundInput).toHaveAttribute('placeholder', 'أيام')
    expect(within(refundField!).queryByText('أيام')).not.toBeInTheDocument()
    expect(
      screen.getByText(
        'يحق للعميل استرداد العربون عند الإلغاء قبل موعد الحجز بـ 3 أيام أو أكثر.',
      ),
    ).toBeInTheDocument()

    // Test dynamic helper when cleared
    await user.clear(refundInput!)
    expect(refundInput).toHaveValue(null)
    expect(
      screen.getByText(
        'يحق للعميل استرداد العربون عند الإلغاء قبل موعد الحجز بعدد الأيام المحدد.',
      ),
    ).toBeInTheDocument()

    // Test typing 3 keeps numeric value 3 and displays dynamic helper
    await user.type(refundInput!, '3')
    expect(refundInput).toHaveValue(3)
    expect(
      screen.getByText(
        'يحق للعميل استرداد العربون عند الإلغاء قبل موعد الحجز بـ 3 أيام أو أكثر.',
      ),
    ).toBeInTheDocument()

    // Test dynamic helper when changed to 5
    await user.clear(refundInput!)
    await user.type(refundInput!, '5')
    expect(refundInput).toHaveValue(5)
    expect(
      screen.getByText(
        'يحق للعميل استرداد العربون عند الإلغاء قبل موعد الحجز بـ 5 أيام أو أكثر.',
      ),
    ).toBeInTheDocument()

    // Submit using updated button copy
    const submitButton = screen.getByRole('button', { name: 'حفظ إعدادات الحجز' })
    await user.click(submitButton)

    expect(mockedUpdateCourt).toHaveBeenCalledWith(
      'nasr-club',
      '7',
      expect.objectContaining({
        minimum_deposit: '150.00',
        internal_hold_expiry_hours: 24,
        requires_digital_payment_reference: true,
        cancellation_refund_notice_days: 5,
      }),
    )
    expect(
      await screen.findByText('تم حفظ إعدادات الحجز'),
    ).toBeInTheDocument()
    expect(screen.queryByText(/التأمين/)).not.toBeInTheDocument()
  })
})
