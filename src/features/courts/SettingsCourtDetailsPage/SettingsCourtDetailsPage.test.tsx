import { render, screen } from '@testing-library/react'
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
    expect(screen.queryByText('سعر الفترة الواحدة')).not.toBeInTheDocument()
    expect(screen.getByText('cannot-edit-hours')).toBeInTheDocument()
  })
})
