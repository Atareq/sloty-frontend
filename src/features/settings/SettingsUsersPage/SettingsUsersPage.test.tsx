import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from '../../../core/auth/useAuth'
import { listClubUsers } from '../../clubUsers/clubUsersApi'
import { listCourts } from '../../courts/courtsApi'
import { SettingsUsersPage } from './SettingsUsersPage'

vi.mock('../../../core/auth/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../../clubUsers/clubUsersApi', () => ({
  listClubUsers: vi.fn(),
}))

vi.mock('../../courts/courtsApi', () => ({
  listCourts: vi.fn(),
}))

const mockedUseAuth = vi.mocked(useAuth)
const mockedListClubUsers = vi.mocked(listClubUsers)
const mockedListCourts = vi.mocked(listCourts)

function paginatedResponse<T>(results: T[]) {
  return {
    count: results.length,
    next: null,
    previous: null,
    results,
  }
}

const ownerUser = {
  id: 1,
  membership_id: 101,
  username: 'owner-user',
  first_name: 'أحمد',
  last_name: 'مالك',
  phone_number: '+201000000001',
  role: 'OWNER' as const,
  membership_is_active: true,
}

const managerUser = {
  id: 2,
  membership_id: 102,
  username: 'manager-user',
  first_name: 'منى',
  last_name: 'مدير',
  phone_number: '+201000000002',
  role: 'MANAGER' as const,
  membership_is_active: false,
  can_change_pricing: true,
  can_manage_working_hours: false,
  can_manage_settlements: true,
}

const staffUser = {
  id: 3,
  membership_id: 103,
  username: 'staff-user',
  first_name: '',
  last_name: '',
  phone_number: '+201000000003',
  role: 'STAFF' as const,
  court: 7,
  court_name: 'ملعب 1',
  membership_is_active: true,
}

function LocationProbe() {
  const location = useLocation()

  return (
    <p data-testid="location">
      {location.pathname}
      {location.search}
    </p>
  )
}

function mockAuth(options: {
  role?: 'OWNER' | 'MANAGER' | 'STAFF'
  selectedClubSlug?: string | null
} = {}) {
  const role = options.role ?? 'OWNER'
  const selectedClubSlug =
    'selectedClubSlug' in options ? options.selectedClubSlug ?? null : 'nasr-club'

  mockedUseAuth.mockReturnValue({
    accessToken: 'token',
    claims: { user_id: 1, role },
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
    refreshCurrentUser: vi.fn(),
    setTokens: vi.fn(),
  })
}

function renderUsersPage(initialEntry = '/settings/users') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route
          element={
            <>
              <SettingsUsersPage />
              <LocationProbe />
            </>
          }
          path="/settings/users"
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('SettingsUsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth()
    mockedListClubUsers.mockResolvedValue([ownerUser, managerUser, staffUser])
    mockedListCourts.mockResolvedValue(
      paginatedResponse([
        {
          id: 7,
          club: 1,
          name: 'ملعب 1',
          sport_type: 'FOOTBALL',
          default_price: '300.00',
          slot_duration_minutes: 60,
          is_active: true,
          requires_digital_payment_reference: false,
          internal_hold_expiry_hours: 2,
        },
      ]),
    )
  })

  it('denies non-owner users with an Arabic message', async () => {
    mockAuth({ role: 'MANAGER' })

    renderUsersPage()

    expect(
      await screen.findByText('ليس لديك صلاحية إدارة المستخدمين والصلاحيات'),
    ).toBeInTheDocument()
    expect(mockedListClubUsers).not.toHaveBeenCalled()
  })

  it('shows no selected club message', async () => {
    mockAuth({ selectedClubSlug: null })

    renderUsersPage()

    expect(
      await screen.findByText('اختر ناديًا أولًا لعرض المستخدمين والصلاحيات'),
    ).toBeInTheDocument()
    expect(mockedListClubUsers).not.toHaveBeenCalled()
  })

  it('calls listClubUsers with the selected club slug and handles array response', async () => {
    renderUsersPage()

    expect(await screen.findByText('أحمد مالك')).toBeInTheDocument()
    expect(mockedListClubUsers).toHaveBeenCalledWith('nasr-club', {})
  })

  it('handles paginated user responses', async () => {
    mockedListClubUsers.mockResolvedValueOnce(paginatedResponse([managerUser]))

    renderUsersPage()

    expect(await screen.findByText('منى مدير')).toBeInTheDocument()
    expect(screen.queryByText('أحمد مالك')).not.toBeInTheDocument()
  })

  it('renders role labels, active states, staff court, and manager permissions', async () => {
    renderUsersPage()

    expect(await screen.findByText('أحمد مالك')).toBeInTheDocument()
    expect(screen.getAllByText('مالك').length).toBeGreaterThan(0)
    expect(screen.getAllByText('مدير').length).toBeGreaterThan(0)
    expect(screen.getAllByText('موظف').length).toBeGreaterThan(0)
    expect(screen.getAllByText('نشط').length).toBeGreaterThan(0)
    expect(screen.getAllByText('غير نشط').length).toBeGreaterThan(0)
    expect(screen.getAllByText('ملعب 1').length).toBeGreaterThan(0)
    expect(screen.getByText('صلاحيات كاملة كمالك')).toBeInTheDocument()
    expect(screen.getByText('موظف تشغيل')).toBeInTheDocument()
    expect(screen.getByText('تعديل أسعار الملاعب')).toBeInTheDocument()
    expect(screen.getByText('إدارة مواعيد العمل')).toBeInTheDocument()
    expect(screen.getByText('إدارة التسويات المالية والجرد')).toBeInTheDocument()
    expect(screen.getAllByText('مفعل').length).toBeGreaterThan(0)
    expect(screen.getByText('غير مفعل')).toBeInTheDocument()
  })

  it('does not render backend permission flag names or editable controls', async () => {
    renderUsersPage()

    await screen.findByText('منى مدير')

    expect(screen.queryByText('can_change_pricing')).not.toBeInTheDocument()
    expect(screen.queryByText('can_manage_working_hours')).not.toBeInTheDocument()
    expect(screen.queryByText('can_manage_settlements')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'تعديل الصلاحيات' }),
    ).not.toBeInTheDocument()
  })

  it('updates URL query params and sends filter values to listClubUsers', async () => {
    const user = userEvent.setup()

    mockedListClubUsers
      .mockResolvedValueOnce([ownerUser, managerUser, staffUser])
      .mockResolvedValueOnce([managerUser])

    renderUsersPage()

    await screen.findByText('أحمد مالك')
    expect(await screen.findByRole('option', { name: 'ملعب 1' }))
      .toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('الدور'), 'MANAGER')
    await user.selectOptions(screen.getByLabelText('الحالة'), 'false')
    await user.selectOptions(screen.getByLabelText('الملعب'), '7')
    await user.click(screen.getByRole('button', { name: 'تطبيق الفلاتر' }))

    await waitFor(() => {
      expect(mockedListClubUsers).toHaveBeenLastCalledWith('nasr-club', {
        role: 'MANAGER',
        court: '7',
        is_active: 'false',
      })
    })
    expect(screen.getByTestId('location')).toHaveTextContent('role=MANAGER')
    expect(screen.getByTestId('location')).toHaveTextContent('court=7')
    expect(screen.getByTestId('location')).toHaveTextContent('is_active=false')
  })

  it('uses search URL query params', async () => {
    renderUsersPage('/settings/users?search=منى')

    expect(await screen.findByDisplayValue('منى')).toBeInTheDocument()
    expect(mockedListClubUsers).toHaveBeenCalledWith('nasr-club', {
      search: 'منى',
    })
  })

  it('renders empty state when no users match filters', async () => {
    mockedListClubUsers.mockResolvedValueOnce([])

    renderUsersPage('/settings/users?role=STAFF')

    expect(
      await screen.findByText('لا يوجد مستخدمون مطابقون للفلاتر الحالية'),
    ).toBeInTheDocument()
  })
})
