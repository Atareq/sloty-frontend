import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiClientError } from '../../../core/api/apiClient'
import { useAuth } from '../../../core/auth/useAuth'
import {
  getPlatformUser,
  updatePlatformUser,
} from '../adminUsersApi'
import type { PlatformUser } from '../adminUsers.types'
import { AdminUserDetailsPage } from './AdminUserDetailsPage'

vi.mock('../../../core/auth/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../adminUsersApi', () => ({
  getPlatformUser: vi.fn(),
  updatePlatformUser: vi.fn(),
}))

const mockedUseAuth = vi.mocked(useAuth)
const mockedGetPlatformUser = vi.mocked(getPlatformUser)
const mockedUpdatePlatformUser = vi.mocked(updatePlatformUser)

const sampleAdminUser: PlatformUser = {
  id: 20,
  username: 'admin-user',
  first_name: 'منى',
  last_name: 'مسؤول',
  phone_number: '+201000000020',
  email: 'admin@example.com',
  is_active: true,
  profile_role: 'ADMIN',
  created_by: null,
}

const sampleOwnerUser: PlatformUser = {
  id: 21,
  username: 'owner-user',
  first_name: 'أحمد',
  last_name: 'مالك',
  phone_number: '+201000000021',
  email: 'owner@example.com',
  is_active: false,
  profile_role: 'OWNER',
  created_by: 20,
}

function renderPage(userId = '20') {
  render(
    <MemoryRouter initialEntries={[`/admin/users/${userId}`]}>
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
      claims: { user_id: 1, role: 'ADMIN' },
      currentUser: null,
      selectedClubSlug: null,
      selectedCourtId: null,
      accessibleClubs: [],
      accessibleCourts: [],
      role: 'ADMIN',
      isAuthenticated: true,
      isLoadingSession: false,
      isTokenExpired: false,
      sessionError: null,
      login: vi.fn(),
      logout: vi.fn(),
      selectClub: vi.fn(),
      clearSelectedClub: vi.fn(),
      selectCourt: vi.fn(),
      refreshCurrentUser: vi.fn(),
      setTokens: vi.fn(),
    })
    mockedGetPlatformUser.mockResolvedValue(sampleAdminUser)
    mockedUpdatePlatformUser.mockResolvedValue({
      ...sampleAdminUser,
      is_active: false,
    })
  })

  it('renders account information with profile role', async () => {
    renderPage('20')

    expect(await screen.findByText('منى مسؤول')).toBeInTheDocument()
    expect(screen.getByText('@admin-user')).toBeInTheDocument()
    expect(screen.getByText('+201000000020')).toBeInTheDocument()
    expect(screen.getByText('admin@example.com')).toBeInTheDocument()
    expect(screen.getByText('مسؤول منصة')).toBeInTheDocument()
    expect(screen.getByText('نشط')).toBeInTheDocument()
  })

  it('does not expose obsolete membership sections or unsupported actions', async () => {
    renderPage('20')

    await screen.findByText('منى مسؤول')

    expect(screen.queryByText(/تغيير.*الدور/)).not.toBeInTheDocument()
    expect(screen.queryByText(/تغيير.*الملعب/)).not.toBeInTheDocument()
    expect(screen.queryByText(/حذف/)).not.toBeInTheDocument()
    expect(screen.queryByText('عضويات الأندية')).not.toBeInTheDocument()
    expect(screen.queryByText('صلاحيات المدير')).not.toBeInTheDocument()
  })

  it('confirms account deactivation then patches /users/{userId}/ and refreshes detail', async () => {
    const testUser = userEvent.setup()

    mockedGetPlatformUser
      .mockResolvedValueOnce(sampleAdminUser)
      .mockResolvedValueOnce({ ...sampleAdminUser, is_active: false })

    renderPage('20')

    await testUser.click(await screen.findByRole('button', { name: 'تعطيل الحساب' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('تأكيد تعطيل الحساب')
    await testUser.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'تعطيل',
      }),
    )

    expect(mockedUpdatePlatformUser).toHaveBeenCalledWith('20', {
      is_active: false,
    })
    await waitFor(() => expect(mockedGetPlatformUser).toHaveBeenCalledTimes(2))
  })

  it('shows account status action for target users', async () => {
    mockedGetPlatformUser.mockResolvedValueOnce(sampleAdminUser)

    renderPage('20')

    expect(await screen.findByRole('button', { name: 'تعطيل الحساب' }))
      .toBeInTheDocument()
    expect(screen.queryByText(/حذف/)).not.toBeInTheDocument()
  })

  it('activates an inactive account through the PATCH contract', async () => {
    const testUser = userEvent.setup()

    mockedGetPlatformUser
      .mockResolvedValueOnce(sampleOwnerUser)
      .mockResolvedValueOnce({ ...sampleOwnerUser, is_active: true })

    renderPage('21')

    await testUser.click(await screen.findByRole('button', { name: 'تفعيل الحساب' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('تأكيد تفعيل الحساب')
    await testUser.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'تفعيل',
      }),
    )

    expect(mockedUpdatePlatformUser).toHaveBeenCalledWith('21', {
      is_active: true,
    })
    await waitFor(() => expect(mockedGetPlatformUser).toHaveBeenCalledTimes(2))
  })

  it('maps 403 account update errors and refreshes /me without retrying', async () => {
    const testUser = userEvent.setup()
    const refreshCurrentUser = vi.fn().mockResolvedValue(undefined)

    mockedUseAuth.mockReturnValue({
      ...mockedUseAuth(),
      refreshCurrentUser,
    })
    mockedUpdatePlatformUser.mockRejectedValueOnce(
      new ApiClientError('Forbidden', 403),
    )

    renderPage('20')

    await testUser.click(await screen.findByRole('button', { name: 'تعطيل الحساب' }))
    await testUser.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'تعطيل',
      }),
    )

    expect(await screen.findByText('ليس لديك صلاحية تنفيذ هذا الإجراء'))
      .toBeInTheDocument()
    expect(refreshCurrentUser).toHaveBeenCalledTimes(1)
    expect(mockedUpdatePlatformUser).toHaveBeenCalledTimes(1)
  })
})
