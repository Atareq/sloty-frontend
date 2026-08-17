import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiClientError } from '../../../core/api/apiClient'
import { useAuth } from '../../../core/auth/useAuth'
import {
  updateManagerPermissions,
  updateMembershipActivity,
} from '../../clubUsers/clubUsersApi'
import { listClubUsers } from '../../clubUsers/clubUsersApi'
import {
  getPlatformUser,
  updatePlatformUser,
} from '../adminUsersApi'
import type {
  PlatformUser,
  PlatformUserMembershipSummary,
} from '../adminUsers.types'
import { AdminUserDetailsPage } from './AdminUserDetailsPage'

vi.mock('../../../core/auth/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../adminUsersApi', () => ({
  getPlatformUser: vi.fn(),
  updatePlatformUser: vi.fn(),
}))

vi.mock('../../clubUsers/clubUsersApi', () => ({
  listClubUsers: vi.fn(),
  updateMembershipActivity: vi.fn(),
  updateManagerPermissions: vi.fn(),
}))

const mockedUseAuth = vi.mocked(useAuth)
const mockedGetPlatformUser = vi.mocked(getPlatformUser)
const mockedUpdatePlatformUser = vi.mocked(updatePlatformUser)
const mockedUpdateMembershipActivity = vi.mocked(updateMembershipActivity)
const mockedUpdateManagerPermissions = vi.mocked(updateManagerPermissions)
const mockedListClubUsers = vi.mocked(listClubUsers)

const userWithoutMemberships = {
  id: 20,
  username: 'admin-user',
  first_name: 'منى',
  last_name: 'مسؤول',
  phone_number: '+201000000020',
  email: 'admin@example.com',
  is_active: true,
  is_platform_admin: true,
}

const userWithMemberships = {
  id: 21,
  username: 'club-user',
  first_name: 'أحمد',
  last_name: 'عضو',
  phone_number: '+201000000021',
  email: 'club@example.com',
  is_active: false,
  is_platform_admin: false,
  memberships: [
    {
      membership_id: 101,
      club_slug: 'nasr-club',
      club_name: 'نادي النصر',
      role: 'MANAGER' as const,
      court_name: null,
      membership_is_active: true,
      manager_can_settle_transactions: true,
      manager_can_change_pricing: false,
      can_manage_settlements: true,
      can_change_pricing: false,
      can_manage_working_hours: false,
    },
    {
      membership_id: 102,
      club_slug: 'nasr-club',
      club_name: 'نادي النصر',
      role: 'STAFF' as const,
      court_name: 'ملعب 1',
      membership_is_active: true,
    },
  ],
}

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/admin/users/21']}>
      <Routes>
        <Route element={<AdminUserDetailsPage />} path="/admin/users/:userId" />
        <Route element={<p>إدارة المستخدمين</p>} path="/admin/users" />
      </Routes>
    </MemoryRouter>,
  )
}

describe('AdminUserDetailsPage', () => {
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
    mockedGetPlatformUser.mockResolvedValue(userWithoutMemberships)
    mockedUpdatePlatformUser.mockResolvedValue({
      ...userWithoutMemberships,
      is_active: false,
    })
    mockedUpdateManagerPermissions.mockResolvedValue({
      id: 21,
      membership_id: 101,
      username: 'club-user',
      first_name: 'أحمد',
      last_name: 'عضو',
      role: 'MANAGER',
    })
    mockedUpdateMembershipActivity.mockResolvedValue({
      id: 21,
      membership_id: 101,
      username: 'club-user',
      first_name: 'أحمد',
      last_name: 'عضو',
      role: 'MANAGER',
    })
  })

  it('renders account information and calm unavailable membership state', async () => {
    renderPage()

    expect(await screen.findByText('منى مسؤول')).toBeInTheDocument()
    expect(screen.getByText('@admin-user')).toBeInTheDocument()
    expect(screen.getByText('+201000000020')).toBeInTheDocument()
    expect(screen.getByText('admin@example.com')).toBeInTheDocument()
    expect(screen.getByText('مسؤول منصة')).toBeInTheDocument()
    expect(
      screen.getByText('لا توجد عضويات مرتبطة بهذا الحساب.'),
    ).toBeInTheDocument()
  })

  it('does not fetch every club membership list or expose unsupported reassignment/delete actions', async () => {
    renderPage()

    await screen.findByText('منى مسؤول')

    expect(mockedListClubUsers).not.toHaveBeenCalled()
    expect(screen.queryByText(/تغيير.*الدور/)).not.toBeInTheDocument()
    expect(screen.queryByText(/تغيير.*الملعب/)).not.toBeInTheDocument()
    expect(screen.queryByText(/حذف/)).not.toBeInTheDocument()
  })

  it('confirms account deactivation then patches /users/{userId}/ and refreshes detail', async () => {
    const testUser = userEvent.setup()

    mockedGetPlatformUser
      .mockResolvedValueOnce(userWithoutMemberships)
      .mockResolvedValueOnce({ ...userWithoutMemberships, is_active: false })

    renderPage()

    await testUser.click(await screen.findByRole('button', { name: 'تعطيل الحساب' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('تعطيل الحساب؟')
    expect(
      screen.getByText(
        'لن يتمكن المستخدم من تسجيل الدخول حتى يتم تفعيل الحساب مرة أخرى.',
      ),
    ).toBeInTheDocument()
    await testUser.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'تعطيل الحساب',
      }),
    )

    expect(mockedUpdatePlatformUser).toHaveBeenCalledWith('21', {
      is_active: false,
    })
    await waitFor(() => expect(mockedGetPlatformUser).toHaveBeenCalledTimes(2))
    expect(await screen.findByText('غير نشط')).toBeInTheDocument()
  })

  it.each([
    ['Platform Admin', { ...userWithoutMemberships, is_platform_admin: true }],
    [
      'Owner',
      {
        ...userWithMemberships,
        is_active: true,
        memberships: [
          {
            ...userWithMemberships.memberships[0],
            role: 'OWNER',
          } satisfies PlatformUserMembershipSummary,
        ],
      },
    ],
    [
      'Manager',
      {
        ...userWithMemberships,
        is_active: true,
        memberships: [
          {
            ...userWithMemberships.memberships[0],
            role: 'MANAGER',
          } satisfies PlatformUserMembershipSummary,
        ],
      },
    ],
    [
      'Staff',
      {
        ...userWithMemberships,
        is_active: true,
        memberships: [
          {
            ...userWithMemberships.memberships[1],
            role: 'STAFF',
          } satisfies PlatformUserMembershipSummary,
        ],
      },
    ],
  ] satisfies Array<[string, PlatformUser]>)(
    'shows account status action for %s targets',
    async (_, targetUser) => {
      mockedGetPlatformUser.mockResolvedValueOnce(targetUser)

      renderPage()

      expect(await screen.findByRole('button', { name: 'تعطيل الحساب' }))
        .toBeInTheDocument()
      expect(screen.queryByText(/حذف/)).not.toBeInTheDocument()
    },
  )

  it('activates an inactive account through the same global PATCH contract', async () => {
    const testUser = userEvent.setup()

    mockedGetPlatformUser
      .mockResolvedValueOnce(userWithMemberships)
      .mockResolvedValueOnce({ ...userWithMemberships, is_active: true })

    renderPage()

    await testUser.click(await screen.findByRole('button', { name: 'تفعيل الحساب' }))
    await testUser.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'تفعيل الحساب',
      }),
    )

    expect(mockedUpdatePlatformUser).toHaveBeenCalledWith('21', {
      is_active: true,
    })
    await waitFor(() => expect(mockedGetPlatformUser).toHaveBeenCalledTimes(2))
  })

  it('renders membership summaries and manager permission edit only for manager memberships', async () => {
    mockedGetPlatformUser.mockResolvedValueOnce(userWithMemberships)

    renderPage()

    expect(await screen.findAllByText('نادي النصر')).toHaveLength(2)
    expect(screen.getByText('إدارة التسويات المالية والجرد')).toBeInTheDocument()
    expect(screen.getByText('موظف تشغيل')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'تعديل صلاحيات العضوية' }))
      .toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'تعطيل العضوية' }))
      .toHaveLength(2)
  })

  it('patches only membership active state and does not change account state', async () => {
    const testUser = userEvent.setup()

    mockedGetPlatformUser
      .mockResolvedValueOnce(userWithMemberships)
      .mockResolvedValueOnce({
        ...userWithMemberships,
        memberships: [
          { ...userWithMemberships.memberships[0], membership_is_active: false },
          userWithMemberships.memberships[1],
        ],
      })

    renderPage()

    await testUser.click(
      (await screen.findAllByRole('button', { name: 'تعطيل العضوية' }))[0],
    )

    expect(mockedUpdateMembershipActivity).toHaveBeenCalledWith(
      'nasr-club',
      101,
      { is_active: false },
    )
    expect(mockedUpdatePlatformUser).not.toHaveBeenCalled()
    await waitFor(() => expect(mockedGetPlatformUser).toHaveBeenCalledTimes(2))
  })

  it('patches only supported manager permission fields and refreshes detail', async () => {
    const testUser = userEvent.setup()

    mockedGetPlatformUser
      .mockResolvedValueOnce(userWithMemberships)
      .mockResolvedValueOnce(userWithMemberships)

    renderPage()

    await testUser.click(
      await screen.findByRole('button', { name: 'تعديل صلاحيات العضوية' }),
    )
    const dialog = screen.getByRole('dialog')

    await testUser.click(
      within(dialog).getByLabelText(/تعديل الأسعار ومواعيد العمل/),
    )
    await testUser.click(within(dialog).getByRole('button', { name: 'حفظ الصلاحيات' }))

    await waitFor(() =>
      expect(mockedUpdateManagerPermissions).toHaveBeenCalledWith(
        'nasr-club',
        101,
        {
          manager_can_settle_transactions: true,
          manager_can_change_pricing: true,
        },
      ),
    )
    expect(mockedUpdateManagerPermissions).not.toHaveBeenCalledWith(
      'nasr-club',
      101,
      expect.objectContaining({ role: expect.anything() }),
    )
    await waitFor(() => expect(mockedGetPlatformUser).toHaveBeenCalledTimes(2))
  })

  it('maps 403 account update errors and refreshes /me without retrying', async () => {
    const testUser = userEvent.setup()
    const refreshCurrentUser = vi.fn()

    mockedUseAuth.mockReturnValue({
      ...mockedUseAuth(),
      refreshCurrentUser,
    })
    mockedUpdatePlatformUser.mockRejectedValueOnce(
      new ApiClientError('Forbidden', 403),
    )

    renderPage()

    await testUser.click(await screen.findByRole('button', { name: 'تعطيل الحساب' }))
    await testUser.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'تعطيل الحساب',
      }),
    )

    expect(await screen.findByText('ليس لديك صلاحية تنفيذ هذا الإجراء'))
      .toBeInTheDocument()
    expect(refreshCurrentUser).toHaveBeenCalledTimes(1)
    expect(mockedUpdatePlatformUser).toHaveBeenCalledTimes(1)
  })
})
