import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiClientError } from '../../../core/api/apiClient'
import { useAuth } from '../../../core/auth/useAuth'
import { chooseAppSelectOption } from '../../../test/appSelectTestUtils'
import { createClubMembership } from '../../clubUsers/clubUsersApi'
import { listClubs } from '../../clubs/clubsApi'
import { listCourts } from '../../courts/courtsApi'
import {
  createPlatformAdmin,
  listPlatformUsers,
} from '../adminUsersApi'
import { AdminUserFormPage } from './AdminUserFormPage'

vi.mock('../../../core/auth/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../adminUsersApi', () => ({
  createPlatformAdmin: vi.fn(),
  listPlatformUsers: vi.fn(),
}))

vi.mock('../../clubUsers/clubUsersApi', () => ({
  createClubMembership: vi.fn(),
}))

vi.mock('../../clubs/clubsApi', () => ({
  listClubs: vi.fn(),
}))

vi.mock('../../courts/courtsApi', () => ({
  listCourts: vi.fn(),
}))

const mockedUseAuth = vi.mocked(useAuth)
const mockedCreatePlatformAdmin = vi.mocked(createPlatformAdmin)
const mockedListPlatformUsers = vi.mocked(listPlatformUsers)
const mockedCreateClubMembership = vi.mocked(createClubMembership)
const mockedListClubs = vi.mocked(listClubs)
const mockedListCourts = vi.mocked(listCourts)

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/admin/users/new']}>
      <Routes>
        <Route element={<AdminUserFormPage />} path="/admin/users/new" />
        <Route element={<p>إدارة المستخدمين</p>} path="/admin/users" />
        <Route element={<p>تفاصيل المستخدم</p>} path="/admin/users/:userId" />
      </Routes>
    </MemoryRouter>,
  )
}

describe('AdminUserFormPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedUseAuth.mockReturnValue({
      accessToken: 'token',
      claims: { user_id: 1, role: 'PLATFORM_ADMIN' },
      currentUser: null,
      selectedClubSlug: null,
      selectedMembership: null,
      role: 'PLATFORM_ADMIN',
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
    mockedListClubs.mockResolvedValue({
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          id: 1,
          name: 'نادي النصر',
          slug: 'nasr-club',
          city: 'ASSIUT',
          is_active: true,
        },
      ],
    })
    mockedListCourts.mockResolvedValue({
      count: 1,
      next: null,
      previous: null,
      results: [
        {
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
          internal_hold_expiry_hours: 2,
        },
      ],
    })
    mockedCreatePlatformAdmin.mockResolvedValue({
      id: 10,
      username: 'admin',
    })
    mockedListPlatformUsers.mockResolvedValue([
      {
        id: 20,
        username: 'existing-user',
        first_name: 'أحمد',
        last_name: 'موجود',
        phone_number: '+201000000020',
      },
    ])
    mockedCreateClubMembership.mockResolvedValue({
      id: 11,
      membership_id: 111,
      username: 'owner',
      first_name: 'مالك',
      last_name: '',
      role: 'OWNER',
      user_summary: {
        id: 20,
        username: 'existing-user',
      },
    } as never)
  })

  it('shows platform admin account fields without club membership fields by default', async () => {
    renderPage()

    expect(await screen.findByLabelText('نوع المستخدم')).toHaveValue(
      'PLATFORM_ADMIN',
    )
    expect(screen.getByLabelText('الاسم الأول')).toBeInTheDocument()
    expect(screen.getByLabelText('اسم المستخدم')).toBeInTheDocument()
    expect(screen.queryByLabelText('النادي')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('الدور')).not.toBeInTheDocument()
    expect(screen.queryByText('صلاحيات المدير')).not.toBeInTheDocument()
  })

  it('allows platform admins to choose owner memberships for club users', async () => {
    const testUser = userEvent.setup()

    renderPage()

    await chooseAppSelectOption(
      testUser,
      await screen.findByLabelText('نوع المستخدم'),
      'مستخدم نادي',
    )

    expect(await screen.findByLabelText('النادي')).toBeInTheDocument()
    await testUser.click(screen.getByLabelText('الدور'))
    expect(await screen.findByRole('option', { name: 'مالك' }))
      .toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'مدير' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'موظف' })).toBeInTheDocument()
    expect(screen.getByText('ربط مستخدم موجود')).toBeInTheDocument()
    expect(screen.queryByLabelText(/user_id/i)).not.toBeInTheDocument()
  })

  it('requires a court before creating staff membership', async () => {
    const testUser = userEvent.setup()

    renderPage()

    await chooseAppSelectOption(
      testUser,
      await screen.findByLabelText('نوع المستخدم'),
      'مستخدم نادي',
    )
    await testUser.type(screen.getByLabelText('الاسم الأول'), 'سامي')
    await testUser.type(screen.getByLabelText('اسم المستخدم'), 'staff-user')
    await testUser.type(screen.getByLabelText('كلمة المرور'), 'secret123')
    await testUser.type(screen.getByLabelText('تأكيد كلمة المرور'), 'secret123')
    await chooseAppSelectOption(testUser, screen.getByLabelText('النادي'), 'نادي النصر')
    await chooseAppSelectOption(testUser, screen.getByLabelText('الدور'), 'موظف')
    await testUser.click(screen.getByRole('button', { name: 'حفظ المستخدم' }))

    expect(await screen.findByText('اختر ملعبًا للموظف')).toBeInTheDocument()
    expect(mockedCreateClubMembership).not.toHaveBeenCalled()

    await waitFor(() => expect(mockedListCourts).toHaveBeenCalledWith('nasr-club'))
  })

  it('links an existing user as owner without court or manager permission fields', async () => {
    const testUser = userEvent.setup()

    renderPage()

    await chooseAppSelectOption(
      testUser,
      await screen.findByLabelText('نوع المستخدم'),
      'مستخدم نادي',
    )
    await testUser.click(screen.getByLabelText('ربط مستخدم موجود'))
    await testUser.type(screen.getByLabelText('البحث عن المستخدم'), 'existing')
    await testUser.click(screen.getByRole('button', { name: 'بحث' }))
    await testUser.click(await screen.findByLabelText(/أحمد موجود/))
    await chooseAppSelectOption(testUser, screen.getByLabelText('النادي'), 'نادي النصر')
    await chooseAppSelectOption(testUser, screen.getByLabelText('الدور'), 'مالك')
    await testUser.click(screen.getByRole('button', { name: 'حفظ المستخدم' }))

    await waitFor(() =>
      expect(mockedCreateClubMembership).toHaveBeenCalledWith('nasr-club', {
        user_id: 20,
        role: 'OWNER',
      }),
    )
    expect(await screen.findByText('تفاصيل المستخدم')).toBeInTheDocument()
  })

  it('links an existing user as manager with only supported manager permission fields', async () => {
    const testUser = userEvent.setup()

    renderPage()

    await chooseAppSelectOption(
      testUser,
      await screen.findByLabelText('نوع المستخدم'),
      'مستخدم نادي',
    )
    await testUser.click(screen.getByLabelText('ربط مستخدم موجود'))
    await testUser.type(screen.getByLabelText('البحث عن المستخدم'), 'existing')
    await testUser.click(screen.getByRole('button', { name: 'بحث' }))
    await testUser.click(await screen.findByLabelText(/أحمد موجود/))
    await chooseAppSelectOption(testUser, screen.getByLabelText('النادي'), 'نادي النصر')
    await chooseAppSelectOption(testUser, screen.getByLabelText('الدور'), 'مدير')
    await testUser.click(
      screen.getByLabelText(/إدارة التسويات المالية والجرد/),
    )
    await testUser.click(screen.getByRole('button', { name: 'حفظ المستخدم' }))

    await waitFor(() =>
      expect(mockedCreateClubMembership).toHaveBeenCalledWith('nasr-club', {
        user_id: 20,
        role: 'MANAGER',
        court: null,
        manager_can_settle_transactions: true,
        manager_can_change_pricing: false,
      }),
    )
    expect(mockedCreateClubMembership).not.toHaveBeenCalledWith(
      'nasr-club',
      expect.objectContaining({ can_manage_working_hours: expect.anything() }),
    )
  })

  it('links an existing user as staff with court and without manager permission fields', async () => {
    const testUser = userEvent.setup()

    renderPage()

    await chooseAppSelectOption(
      testUser,
      await screen.findByLabelText('نوع المستخدم'),
      'مستخدم نادي',
    )
    await testUser.click(screen.getByLabelText('ربط مستخدم موجود'))
    await testUser.type(screen.getByLabelText('البحث عن المستخدم'), 'existing')
    await testUser.click(screen.getByRole('button', { name: 'بحث' }))
    await testUser.click(await screen.findByLabelText(/أحمد موجود/))
    await chooseAppSelectOption(testUser, screen.getByLabelText('النادي'), 'نادي النصر')
    await chooseAppSelectOption(testUser, screen.getByLabelText('الدور'), 'موظف')
    await chooseAppSelectOption(
      testUser,
      await screen.findByLabelText('الملعب'),
      'ملعب 1',
    )
    await testUser.click(screen.getByRole('button', { name: 'حفظ المستخدم' }))

    await waitFor(() =>
      expect(mockedCreateClubMembership).toHaveBeenCalledWith('nasr-club', {
        user_id: 20,
        role: 'STAFF',
        court: 7,
      }),
    )
  })

  it('maps duplicate username field errors to Arabic', async () => {
    const testUser = userEvent.setup()

    mockedCreatePlatformAdmin.mockRejectedValueOnce(
      new ApiClientError('username already exists', 400, {
        fieldErrors: {
          username: [
            {
              code: 'unique',
              message: 'username already exists',
            },
          ],
        },
      }),
    )

    renderPage()

    await testUser.type(await screen.findByLabelText('الاسم الأول'), 'منى')
    await testUser.type(screen.getByLabelText('اسم المستخدم'), 'admin')
    await testUser.type(screen.getByLabelText('كلمة المرور'), 'secret123')
    await testUser.type(screen.getByLabelText('تأكيد كلمة المرور'), 'secret123')
    await testUser.click(screen.getByRole('button', { name: 'حفظ المستخدم' }))

    expect(await screen.findAllByText('اسم المستخدم مستخدم بالفعل'))
      .toHaveLength(2)
  })
})
