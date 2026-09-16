import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiClientError } from '../../../core/api/apiClient'
import { useAuth } from '../../../core/auth/useAuth'
import { settingsCopy } from '../../../shared/copy/appCopy'
import { createPlatformAdmin } from '../adminUsersApi'
import { AdminUserFormPage } from './AdminUserFormPage'

vi.mock('../../../core/auth/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../adminUsersApi', () => ({
  createPlatformAdmin: vi.fn(),
}))

const mockedUseAuth = vi.mocked(useAuth)
const mockedCreatePlatformAdmin = vi.mocked(createPlatformAdmin)

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
    mockedCreatePlatformAdmin.mockResolvedValue({
      id: 10,
      username: 'admin',
      first_name: 'منى',
      last_name: 'مسؤول',
      email: 'admin@example.com',
      phone_number: null,
      is_active: true,
      profile_role: 'ADMIN',
    })
  })

  it('renders platform admin account fields without membership fields', async () => {
    renderPage()

    expect(screen.getByLabelText('الاسم الأول')).toBeInTheDocument()
    expect(screen.getByLabelText('اسم العائلة')).toBeInTheDocument()
    expect(screen.getByLabelText('اسم المستخدم')).toBeInTheDocument()
    expect(screen.getByLabelText('البريد الإلكتروني')).toBeInTheDocument()
    expect(screen.getByLabelText('كلمة المرور')).toBeInTheDocument()
    expect(screen.getByLabelText('تأكيد كلمة المرور')).toBeInTheDocument()

    expect(screen.queryByLabelText('النادي')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('الدور')).not.toBeInTheDocument()
  })

  it('creates platform admin user and navigates to detail', async () => {
    const testUser = userEvent.setup()

    renderPage()

    await testUser.type(screen.getByLabelText('الاسم الأول'), 'منى')
    await testUser.type(screen.getByLabelText('اسم المستخدم'), 'admin')
    await testUser.type(screen.getByLabelText('كلمة المرور'), 'secret123')
    await testUser.type(screen.getByLabelText('تأكيد كلمة المرور'), 'secret123')
    await testUser.click(screen.getByRole('button', { name: 'حفظ المستخدم' }))

    await waitFor(() =>
      expect(mockedCreatePlatformAdmin).toHaveBeenCalledWith({
        first_name: 'منى',
        last_name: undefined,
        username: 'admin',
        password: 'secret123',
        email: undefined,
        phone_number: undefined,
      }),
    )

    expect(await screen.findByText('تفاصيل المستخدم')).toBeInTheDocument()
  })

  it('validates required fields', async () => {
    const testUser = userEvent.setup()

    renderPage()

    await testUser.click(screen.getByRole('button', { name: 'حفظ المستخدم' }))

    expect(screen.getByText('الاسم الأول مطلوب')).toBeInTheDocument()
    expect(screen.getByText('اسم المستخدم مطلوب')).toBeInTheDocument()
    expect(screen.getByText('كلمة المرور مطلوبة')).toBeInTheDocument()
    expect(mockedCreatePlatformAdmin).not.toHaveBeenCalled()
  })

  it('validates password mismatch', async () => {
    const testUser = userEvent.setup()

    renderPage()

    await testUser.type(screen.getByLabelText('الاسم الأول'), 'منى')
    await testUser.type(screen.getByLabelText('اسم المستخدم'), 'admin')
    await testUser.type(screen.getByLabelText('كلمة المرور'), 'secret123')
    await testUser.type(screen.getByLabelText('تأكيد كلمة المرور'), 'different')
    await testUser.click(screen.getByRole('button', { name: 'حفظ المستخدم' }))

    expect(screen.getByText(settingsCopy.passwordMismatch)).toBeInTheDocument()
    expect(mockedCreatePlatformAdmin).not.toHaveBeenCalled()
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

    await testUser.type(screen.getByLabelText('الاسم الأول'), 'منى')
    await testUser.type(screen.getByLabelText('اسم المستخدم'), 'admin')
    await testUser.type(screen.getByLabelText('كلمة المرور'), 'secret123')
    await testUser.type(screen.getByLabelText('تأكيد كلمة المرور'), 'secret123')
    await testUser.click(screen.getByRole('button', { name: 'حفظ المستخدم' }))

    expect(await screen.findAllByText('اسم المستخدم مستخدم بالفعل'))
      .toHaveLength(2)
  })
})
