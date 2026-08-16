import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiClientError } from '../../../core/api/apiClient'
import { useAuth } from '../../../core/auth/useAuth'
import {
  createClubMembership,
  listClubUsers,
  updateManagerPermissions,
} from '../../clubUsers/clubUsersApi'
import { listCourts } from '../../courts/courtsApi'
import { SettingsUsersPage } from './SettingsUsersPage'

vi.mock('../../../core/auth/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../../clubUsers/clubUsersApi', () => ({
  createClubMembership: vi.fn(),
  listClubUsers: vi.fn(),
  updateManagerPermissions: vi.fn(),
}))

vi.mock('../../courts/courtsApi', () => ({
  listCourts: vi.fn(),
}))

const mockedUseAuth = vi.mocked(useAuth)
const mockedCreateClubMembership = vi.mocked(createClubMembership)
const mockedListClubUsers = vi.mocked(listClubUsers)
const mockedUpdateManagerPermissions = vi.mocked(updateManagerPermissions)
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
  manager_can_settle_transactions: true,
  manager_can_change_pricing: true,
  can_change_pricing: true,
  can_manage_working_hours: false,
  can_manage_settlements: true,
}

const managerWithoutPermissions = {
  ...managerUser,
  id: 4,
  membership_id: 104,
  username: 'restricted-manager',
  first_name: 'سارة',
  last_name: 'محدود',
  manager_can_settle_transactions: false,
  manager_can_change_pricing: false,
  can_change_pricing: false,
  can_manage_working_hours: false,
  can_manage_settlements: false,
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
  selectedMembershipId?: number
} = {}) {
  const role = options.role ?? 'OWNER'
  const selectedClubSlug =
    'selectedClubSlug' in options ? options.selectedClubSlug ?? null : 'nasr-club'
  const refreshCurrentUser = vi.fn()

  mockedUseAuth.mockReturnValue({
    accessToken: 'token',
    claims: { user_id: 1, role },
    currentUser: null,
    selectedClubSlug,
    selectedMembership: selectedClubSlug
      ? {
          id: options.selectedMembershipId ?? 10,
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
    refreshCurrentUser,
    setTokens: vi.fn(),
  })

  return { refreshCurrentUser }
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

async function openAddUserSheet(testUser: ReturnType<typeof userEvent.setup>) {
  await screen.findByText('أحمد مالك')
  await testUser.click(screen.getByRole('button', { name: 'إضافة مستخدم' }))

  return within(screen.getByRole('dialog'))
}

describe('SettingsUsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth()
    mockedListClubUsers.mockResolvedValue([ownerUser, managerUser, staffUser])
    mockedCreateClubMembership.mockResolvedValue(managerUser)
    mockedUpdateManagerPermissions.mockResolvedValue(managerUser)
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
    expect(screen.queryByText('إدارة مواعيد العمل')).not.toBeInTheDocument()
    expect(screen.getByText('إدارة التسويات المالية والجرد')).toBeInTheDocument()
  })

  it('shows manager-only edit action without backend permission flag names', async () => {
    renderUsersPage()

    await screen.findByText('منى مدير')

    expect(screen.queryByText('can_change_pricing')).not.toBeInTheDocument()
    expect(screen.queryByText('can_manage_working_hours')).not.toBeInTheDocument()
    expect(screen.queryByText('can_manage_settlements')).not.toBeInTheDocument()
    expect(
      screen.getAllByRole('button', { name: 'تعديل الصلاحيات' }),
    ).toHaveLength(1)
  })

  it('does not show manager permission edit action for unauthorized roles', async () => {
    mockAuth({ role: 'MANAGER' })

    renderUsersPage()

    expect(
      await screen.findByText('ليس لديك صلاحية إدارة المستخدمين والصلاحيات'),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'تعديل الصلاحيات' }),
    ).not.toBeInTheDocument()
  })

  it('shows owner-only add user action and opens the add user sheet', async () => {
    const user = userEvent.setup()

    renderUsersPage()

    const dialog = await openAddUserSheet(user)

    expect(dialog.getByText('إضافة مستخدم')).toBeInTheDocument()
    expect(dialog.getByLabelText('الدور')).toBeInTheDocument()
    expect(dialog.getByRole('option', { name: 'مدير' })).toBeInTheDocument()
    expect(dialog.getByRole('option', { name: 'موظف' })).toBeInTheDocument()
    expect(dialog.queryByRole('option', { name: 'مالك' })).not.toBeInTheDocument()
    expect(dialog.getByText('مستخدم جديد')).toBeInTheDocument()
    expect(dialog.getByText('مستخدم موجود')).toBeInTheDocument()
    expect(
      dialog.getByText(
        'اختيار مستخدم موجود غير متاح حتى يتم تأكيد Endpoint البحث عن المستخدمين.',
      ),
    ).toBeInTheDocument()
  })

  it('does not show add user action for unauthorized roles', async () => {
    mockAuth({ role: 'MANAGER' })

    renderUsersPage()

    expect(
      await screen.findByText('ليس لديك صلاحية إدارة المستخدمين والصلاحيات'),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'إضافة مستخدم' }),
    ).not.toBeInTheDocument()
  })

  it('shows new user fields in add user sheet', async () => {
    const user = userEvent.setup()

    renderUsersPage()

    const dialog = await openAddUserSheet(user)

    expect(dialog.getByLabelText('الاسم الأول')).toBeInTheDocument()
    expect(dialog.getByLabelText('اسم العائلة')).toBeInTheDocument()
    expect(dialog.getByLabelText('رقم الهاتف')).toBeInTheDocument()
    expect(dialog.getByLabelText('الدولة أو المنطقة')).toHaveValue('EG')
    expect(dialog.getByLabelText('البريد الإلكتروني')).toBeInTheDocument()
    expect(dialog.getByLabelText('اسم المستخدم')).toBeInTheDocument()
    expect(dialog.getByLabelText('كلمة المرور')).toBeInTheDocument()
  })

  it('shows manager permission toggles defaulted false for add manager', async () => {
    const user = userEvent.setup()

    renderUsersPage()

    const dialog = await openAddUserSheet(user)
    await user.selectOptions(dialog.getByLabelText('الدور'), 'MANAGER')

    expect(dialog.getByText('صلاحيات المدير')).toBeInTheDocument()
    expect(
      dialog.getByRole('checkbox', { name: /إدارة التسويات المالية والجرد/ }),
    ).not.toBeChecked()
    expect(
      dialog.getByRole('checkbox', { name: /تعديل الأسعار ومواعيد العمل/ }),
    ).not.toBeChecked()
    expect(dialog.queryByLabelText('الملعب المسؤول عنه')).not.toBeInTheDocument()
  })

  it('shows staff court selector, hides manager toggles, and clears manager permissions', async () => {
    const user = userEvent.setup()

    renderUsersPage()

    const dialog = await openAddUserSheet(user)
    await user.selectOptions(dialog.getByLabelText('الدور'), 'MANAGER')
    await user.click(
      dialog.getByRole('checkbox', { name: /إدارة التسويات المالية والجرد/ }),
    )
    await user.selectOptions(dialog.getByLabelText('الدور'), 'STAFF')

    expect(dialog.getByLabelText('الملعب المسؤول عنه')).toBeInTheDocument()
    expect(dialog.queryByText('صلاحيات المدير')).not.toBeInTheDocument()
    expect(
      dialog.queryByRole('checkbox', { name: /إدارة التسويات المالية والجرد/ }),
    ).not.toBeInTheDocument()
  })

  it('requires staff court before submit', async () => {
    const user = userEvent.setup()

    renderUsersPage()

    const dialog = await openAddUserSheet(user)
    await user.selectOptions(dialog.getByLabelText('الدور'), 'STAFF')
    await user.type(dialog.getByLabelText('الاسم الأول'), 'سامي')
    await user.type(dialog.getByLabelText('اسم المستخدم'), 'staff-new')
    await user.type(dialog.getByLabelText('كلمة المرور'), 'secret123')
    await user.click(dialog.getByRole('button', { name: 'حفظ المستخدم' }))

    expect(dialog.getAllByText('اختر ملعبًا للموظف').length).toBeGreaterThan(1)
    expect(mockedCreateClubMembership).not.toHaveBeenCalled()
  })

  it('creates a new manager membership with E.164 phone and membership-level manager permissions', async () => {
    const user = userEvent.setup()
    mockedListClubUsers
      .mockResolvedValueOnce([ownerUser, managerUser, staffUser])
      .mockResolvedValueOnce([ownerUser, managerUser, staffUser])

    renderUsersPage()

    const dialog = await openAddUserSheet(user)
    await user.selectOptions(dialog.getByLabelText('الدور'), 'MANAGER')
    await user.type(dialog.getByLabelText('الاسم الأول'), 'ليلى')
    await user.type(dialog.getByLabelText('اسم العائلة'), 'مدير')
    await user.type(dialog.getByLabelText('رقم الهاتف'), '01111111111')
    await user.type(dialog.getByLabelText('البريد الإلكتروني'), 'manager@example.com')
    await user.type(dialog.getByLabelText('اسم المستخدم'), 'new-manager')
    await user.type(dialog.getByLabelText('كلمة المرور'), 'secret123')
    await user.click(
      dialog.getByRole('checkbox', { name: /إدارة التسويات المالية والجرد/ }),
    )
    await user.click(dialog.getByRole('button', { name: 'حفظ المستخدم' }))

    await waitFor(() => {
      expect(mockedCreateClubMembership).toHaveBeenCalledWith('nasr-club', {
        user: {
          username: 'new-manager',
          email: 'manager@example.com',
          password: 'secret123',
          first_name: 'ليلى',
          last_name: 'مدير',
          phone_number: '+201111111111',
        },
        role: 'MANAGER',
        court: null,
        manager_can_settle_transactions: true,
        manager_can_change_pricing: false,
      })
    })
    expect(mockedCreateClubMembership).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        user: expect.objectContaining({
          phone_number: '01111111111',
        }),
      }),
    )
    expect(mockedCreateClubMembership).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        can_change_pricing: expect.anything(),
        can_manage_working_hours: expect.anything(),
        can_manage_settlements: expect.anything(),
      }),
    )
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    expect(mockedListClubUsers).toHaveBeenCalledTimes(2)
  })

  it('creates a new staff membership with E.164 phone, court, and no manager permissions', async () => {
    const user = userEvent.setup()

    renderUsersPage()

    const dialog = await openAddUserSheet(user)
    await user.selectOptions(dialog.getByLabelText('الدور'), 'STAFF')
    await user.type(dialog.getByLabelText('الاسم الأول'), 'سامي')
    await user.type(dialog.getByLabelText('رقم الهاتف'), '01012345678')
    await user.type(dialog.getByLabelText('اسم المستخدم'), 'new-staff')
    await user.type(dialog.getByLabelText('كلمة المرور'), 'secret123')
    await user.selectOptions(dialog.getByLabelText('الملعب المسؤول عنه'), '7')
    await user.click(dialog.getByRole('button', { name: 'حفظ المستخدم' }))

    await waitFor(() => {
      expect(mockedCreateClubMembership).toHaveBeenCalledWith('nasr-club', {
        user: {
          username: 'new-staff',
          email: undefined,
          password: 'secret123',
          first_name: 'سامي',
          last_name: '',
          phone_number: '+201012345678',
        },
        role: 'STAFF',
        court: 7,
      })
    })
    expect(mockedCreateClubMembership).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        manager_can_settle_transactions: expect.anything(),
        manager_can_change_pricing: expect.anything(),
      }),
    )
    expect(mockedCreateClubMembership).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        user: expect.objectContaining({
          phone_number: '01012345678',
        }),
      }),
    )
  })

  it('blocks invalid add-user phone numbers with an Arabic message', async () => {
    const user = userEvent.setup()

    renderUsersPage()

    const dialog = await openAddUserSheet(user)
    await user.selectOptions(dialog.getByLabelText('الدور'), 'STAFF')
    await user.type(dialog.getByLabelText('الاسم الأول'), 'سامي')
    await user.type(dialog.getByLabelText('رقم الهاتف'), '01012')
    await user.type(dialog.getByLabelText('اسم المستخدم'), 'new-staff')
    await user.type(dialog.getByLabelText('كلمة المرور'), 'secret123')
    await user.selectOptions(dialog.getByLabelText('الملعب المسؤول عنه'), '7')
    await user.click(dialog.getByRole('button', { name: 'حفظ المستخدم' }))

    expect(dialog.getByText('أدخل رقم هاتف صحيح')).toBeInTheDocument()
    expect(mockedCreateClubMembership).not.toHaveBeenCalled()
  })

  it('omits optional empty phone for new staff users', async () => {
    const user = userEvent.setup()

    renderUsersPage()

    const dialog = await openAddUserSheet(user)
    await user.selectOptions(dialog.getByLabelText('الدور'), 'STAFF')
    await user.type(dialog.getByLabelText('الاسم الأول'), 'سامي')
    await user.type(dialog.getByLabelText('اسم المستخدم'), 'new-staff')
    await user.type(dialog.getByLabelText('كلمة المرور'), 'secret123')
    await user.selectOptions(dialog.getByLabelText('الملعب المسؤول عنه'), '7')
    await user.click(dialog.getByRole('button', { name: 'حفظ المستخدم' }))

    await waitFor(() => {
      expect(mockedCreateClubMembership).toHaveBeenCalledWith(
        'nasr-club',
        expect.objectContaining({
          user: expect.objectContaining({
            phone_number: undefined,
          }),
        }),
      )
    })
  })

  it('shows backend add-user field errors and duplicate validation message', async () => {
    const user = userEvent.setup()
    mockedCreateClubMembership.mockRejectedValueOnce(
      new ApiClientError('هذا المستخدم عضو بالفعل في النادي', 400, {
        fieldErrors: {
          username: [
            {
              code: 'DUPLICATE',
              message: 'اسم المستخدم مستخدم بالفعل',
            },
          ],
          manager_can_change_pricing: [
            {
              code: 'MANAGER_PERMISSION_REQUIRES_MANAGER_ROLE',
              message: 'صلاحية الأسعار متاحة للمدير فقط',
            },
          ],
        },
      }),
    )

    renderUsersPage()

    const dialog = await openAddUserSheet(user)
    await user.selectOptions(dialog.getByLabelText('الدور'), 'MANAGER')
    await user.type(dialog.getByLabelText('الاسم الأول'), 'ليلى')
    await user.type(dialog.getByLabelText('اسم المستخدم'), 'new-manager')
    await user.type(dialog.getByLabelText('كلمة المرور'), 'secret123')
    await user.click(dialog.getByRole('button', { name: 'حفظ المستخدم' }))

    expect(
      await screen.findByText('هذا المستخدم عضو بالفعل في النادي'),
    ).toBeInTheDocument()
    expect(screen.getByText('اسم المستخدم مستخدم بالفعل')).toBeInTheDocument()
    expect(screen.getByText('صلاحية الأسعار متاحة للمدير فقط')).toBeInTheDocument()
  })

  it('shows 403 add-user error, refreshes current user, and does not retry', async () => {
    const user = userEvent.setup()
    const { refreshCurrentUser } = mockAuth()
    mockedCreateClubMembership.mockRejectedValueOnce(
      new ApiClientError('ليس لديك صلاحية لهذا الإجراء.', 403),
    )

    renderUsersPage()

    const dialog = await openAddUserSheet(user)
    await user.selectOptions(dialog.getByLabelText('الدور'), 'MANAGER')
    await user.type(dialog.getByLabelText('الاسم الأول'), 'ليلى')
    await user.type(dialog.getByLabelText('اسم المستخدم'), 'new-manager')
    await user.type(dialog.getByLabelText('كلمة المرور'), 'secret123')
    await user.click(dialog.getByRole('button', { name: 'حفظ المستخدم' }))

    expect(
      await screen.findByText('ليس لديك صلاحية لهذا الإجراء.'),
    ).toBeInTheDocument()
    expect(refreshCurrentUser).toHaveBeenCalledTimes(1)
    expect(mockedCreateClubMembership).toHaveBeenCalledTimes(1)
  })

  it('shows no permissions state when a manager has no effective permissions', async () => {
    mockedListClubUsers.mockResolvedValueOnce([managerWithoutPermissions])

    renderUsersPage()

    expect(await screen.findByText('سارة محدود')).toBeInTheDocument()
    expect(screen.getByText('لا توجد صلاحيات إضافية')).toBeInTheDocument()
    expect(screen.queryByText('تعديل أسعار الملاعب')).not.toBeInTheDocument()
    expect(
      screen.queryByText('إدارة التسويات المالية والجرد'),
    ).not.toBeInTheDocument()
  })

  it('opens edit sheet with manager identity and current permissions', async () => {
    const user = userEvent.setup()

    renderUsersPage()

    await screen.findByText('منى مدير')
    await user.click(screen.getByRole('button', { name: 'تعديل الصلاحيات' }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('تعديل صلاحيات المدير')).toBeInTheDocument()
    expect(screen.getByText('منى مدير · مدير')).toBeInTheDocument()
    expect(
      screen.getByRole('checkbox', { name: /إدارة التسويات المالية والجرد/ }),
    ).toBeChecked()
    expect(
      screen.getByRole('checkbox', { name: /تعديل الأسعار ومواعيد العمل/ }),
    ).toBeChecked()
  })

  it('defaults manager edit permissions to false when no permission exists', async () => {
    const user = userEvent.setup()
    mockedListClubUsers.mockResolvedValueOnce([managerWithoutPermissions])

    renderUsersPage()

    await screen.findByText('سارة محدود')
    await user.click(screen.getByRole('button', { name: 'تعديل الصلاحيات' }))

    expect(
      screen.getByRole('checkbox', { name: /إدارة التسويات المالية والجرد/ }),
    ).not.toBeChecked()
    expect(
      screen.getByRole('checkbox', { name: /تعديل الأسعار ومواعيد العمل/ }),
    ).not.toBeChecked()
  })

  it('submits only membership-level manager permission fields and refreshes users', async () => {
    const user = userEvent.setup()
    mockedListClubUsers
      .mockResolvedValueOnce([managerWithoutPermissions])
      .mockResolvedValueOnce([{ ...managerWithoutPermissions, can_manage_settlements: true }])

    renderUsersPage()

    await screen.findByText('سارة محدود')
    await user.click(screen.getByRole('button', { name: 'تعديل الصلاحيات' }))
    await user.click(
      screen.getByRole('checkbox', { name: /إدارة التسويات المالية والجرد/ }),
    )
    await user.click(
      screen.getByRole('checkbox', { name: /تعديل الأسعار ومواعيد العمل/ }),
    )
    await user.click(screen.getByRole('button', { name: 'حفظ الصلاحيات' }))

    await waitFor(() => {
      expect(mockedUpdateManagerPermissions).toHaveBeenCalledWith(
        'nasr-club',
        104,
        {
          manager_can_settle_transactions: true,
          manager_can_change_pricing: true,
        },
      )
    })
    expect(mockedUpdateManagerPermissions).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        role: expect.anything(),
        court: expect.anything(),
        user: expect.anything(),
        can_manage_settlements: expect.anything(),
        can_change_pricing: expect.anything(),
      }),
    )
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    expect(mockedListClubUsers).toHaveBeenCalledTimes(2)
  })

  it('refreshes current user after updating the active selected membership', async () => {
    const user = userEvent.setup()
    const { refreshCurrentUser } = mockAuth({
      role: 'OWNER',
      selectedMembershipId: 102,
    })
    mockedListClubUsers
      .mockResolvedValueOnce([managerUser])
      .mockResolvedValueOnce([managerUser])

    renderUsersPage()

    await screen.findByText('منى مدير')
    await user.click(screen.getByRole('button', { name: 'تعديل الصلاحيات' }))
    await user.click(screen.getByRole('button', { name: 'حفظ الصلاحيات' }))

    await waitFor(() => {
      expect(refreshCurrentUser).toHaveBeenCalledTimes(1)
    })
  })

  it('shows backend field errors near matching manager permission toggles', async () => {
    const user = userEvent.setup()
    mockedUpdateManagerPermissions.mockRejectedValueOnce(
      new ApiClientError('راجع صلاحيات المدير', 400, {
        fieldErrors: {
          manager_can_change_pricing: [
            {
              code: 'MANAGER_PERMISSION_REQUIRES_MANAGER_ROLE',
              message: 'صلاحية الأسعار متاحة للمدير فقط',
            },
          ],
          manager_can_settle_transactions: [
            {
              code: 'MANAGER_PERMISSION_REQUIRES_MANAGER_ROLE',
              message: 'صلاحية التسويات متاحة للمدير فقط',
            },
          ],
        },
      }),
    )

    renderUsersPage()

    await screen.findByText('منى مدير')
    await user.click(screen.getByRole('button', { name: 'تعديل الصلاحيات' }))
    await user.click(screen.getByRole('button', { name: 'حفظ الصلاحيات' }))

    expect(await screen.findByText('راجع صلاحيات المدير')).toBeInTheDocument()
    expect(screen.getByText('صلاحية الأسعار متاحة للمدير فقط')).toBeInTheDocument()
    expect(screen.getByText('صلاحية التسويات متاحة للمدير فقط')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(mockedUpdateManagerPermissions).toHaveBeenCalledTimes(1)
  })

  it('shows 403 error, refreshes current user, and does not retry automatically', async () => {
    const user = userEvent.setup()
    const { refreshCurrentUser } = mockAuth()
    mockedUpdateManagerPermissions.mockRejectedValueOnce(
      new ApiClientError('ليس لديك صلاحية لهذا الإجراء.', 403),
    )

    renderUsersPage()

    await screen.findByText('منى مدير')
    await user.click(screen.getByRole('button', { name: 'تعديل الصلاحيات' }))
    await user.click(screen.getByRole('button', { name: 'حفظ الصلاحيات' }))

    expect(
      await screen.findByText('ليس لديك صلاحية لهذا الإجراء.'),
    ).toBeInTheDocument()
    expect(refreshCurrentUser).toHaveBeenCalledTimes(1)
    expect(mockedUpdateManagerPermissions).toHaveBeenCalledTimes(1)
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
