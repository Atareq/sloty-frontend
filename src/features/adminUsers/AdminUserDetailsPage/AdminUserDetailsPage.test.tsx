import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiClientError } from '../../../core/api/apiClient'
import { useAuth } from '../../../core/auth/useAuth'
import { updateManagerPermissions } from '../../clubUsers/clubUsersApi'
import { listClubUsers } from '../../clubUsers/clubUsersApi'
import {
  getPlatformUser,
  updatePlatformUser,
} from '../adminUsersApi'
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
  updateManagerPermissions: vi.fn(),
}))

const mockedUseAuth = vi.mocked(useAuth)
const mockedGetPlatformUser = vi.mocked(getPlatformUser)
const mockedUpdatePlatformUser = vi.mocked(updatePlatformUser)
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
  })

  it('renders account information and calm unavailable membership state', async () => {
    renderPage()

    expect(await screen.findByText('منى مسؤول')).toBeInTheDocument()
    expect(screen.getByText('@admin-user')).toBeInTheDocument()
    expect(screen.getByText('+201000000020')).toBeInTheDocument()
    expect(screen.getByText('admin@example.com')).toBeInTheDocument()
    expect(screen.getByText('مسؤول منصة')).toBeInTheDocument()
    expect(
      screen.getByText('تفاصيل العضويات غير متاحة من الخادم حاليًا.'),
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

  it('updates account status through PATCH /users/{userId}/ and refreshes detail', async () => {
    const testUser = userEvent.setup()

    mockedGetPlatformUser
      .mockResolvedValueOnce(userWithoutMemberships)
      .mockResolvedValueOnce({ ...userWithoutMemberships, is_active: false })

    renderPage()

    await testUser.click(await screen.findByRole('button', { name: 'تعطيل الحساب' }))

    expect(mockedUpdatePlatformUser).toHaveBeenCalledWith('21', {
      is_active: false,
    })
    await waitFor(() => expect(mockedGetPlatformUser).toHaveBeenCalledTimes(2))
    expect(await screen.findByText('غير نشط')).toBeInTheDocument()
  })

  it('renders membership summaries and manager permission edit only for manager memberships', async () => {
    mockedGetPlatformUser.mockResolvedValueOnce(userWithMemberships)

    renderPage()

    expect(await screen.findAllByText('نادي النصر')).toHaveLength(2)
    expect(screen.getByText('إدارة التسويات المالية والجرد')).toBeInTheDocument()
    expect(screen.getByText('موظف تشغيل')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'تعديل صلاحيات العضوية' }))
      .toBeInTheDocument()
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

    expect(await screen.findByText('ليس لديك صلاحية تنفيذ هذا الإجراء'))
      .toBeInTheDocument()
    expect(refreshCurrentUser).toHaveBeenCalledTimes(1)
    expect(mockedUpdatePlatformUser).toHaveBeenCalledTimes(1)
  })
})
