import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from '../../../core/auth/useAuth'
import { SettingsHubPage } from './SettingsHubPage'

vi.mock('../../../core/auth/useAuth', () => ({
  useAuth: vi.fn(),
}))

const mockedUseAuth = vi.mocked(useAuth)

function mockAuth(role: 'OWNER' | 'MANAGER' = 'OWNER') {
  mockedUseAuth.mockReturnValue({
    accessToken: 'token',
    claims: { user_id: 1, role },
    currentUser: null,
    selectedClubSlug: 'nasr-club',
    selectedMembership: {
      id: 10,
      role,
      club: {
        id: 1,
        name: 'نادي النصر',
        slug: 'nasr-club',
        city: 'ASSIUT',
        is_active: true,
      },
      court: null,
    },
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

describe('SettingsHubPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth()
  })

  it('links owners to court settings and users permissions', () => {
    render(
      <MemoryRouter>
        <SettingsHubPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('إعدادات الملاعب')).toBeInTheDocument()
    expect(screen.getByText('المستخدمون والصلاحيات')).toBeInTheDocument()
    expect(screen.getByText('سجل النشاط')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'فتح إعدادات الملاعب' }))
      .toHaveAttribute('href', '/settings/courts')
    expect(
      screen.getByRole('link', { name: 'فتح المستخدمين والصلاحيات' }),
    ).toHaveAttribute('href', '/settings/users')
    expect(screen.getByRole('link', { name: 'عرض سجل النشاط' }))
      .toHaveAttribute('href', '/audit-logs')
  })

  it('does not show owner-only permission link for non-owner rendering', () => {
    mockAuth('MANAGER')

    render(
      <MemoryRouter>
        <SettingsHubPage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: 'فتح إعدادات الملاعب' }))
      .toHaveAttribute('href', '/settings/courts')
    expect(
      screen.queryByRole('link', { name: 'فتح المستخدمين والصلاحيات' }),
    ).not.toBeInTheDocument()
    // Account security is available for managers too
    expect(screen.getByText('الأمان والحساب')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'تغيير كلمة المرور' }),
    ).toBeInTheDocument()
  })

  it('renders account security and opens change password sheet', async () => {
    const user = (await import('@testing-library/user-event')).default.setup()

    render(
      <MemoryRouter>
        <SettingsHubPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('الأمان والحساب')).toBeInTheDocument()
    expect(
      screen.getByText('غيّر كلمة مرور حسابك للحفاظ على أمانه.'),
    ).toBeInTheDocument()

    const openButton = screen.getByRole('button', { name: 'تغيير كلمة المرور' })
    await user.click(openButton)

    expect(screen.getByLabelText('كلمة المرور الحالية')).toBeInTheDocument()
    expect(screen.getByLabelText('كلمة المرور الجديدة')).toBeInTheDocument()
    expect(screen.getByLabelText('تأكيد كلمة المرور الجديدة')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'حفظ كلمة المرور' }),
    ).toBeInTheDocument()

    // Test mismatch validation locally
    await user.type(screen.getByLabelText('كلمة المرور الحالية'), 'cur123')
    await user.type(screen.getByLabelText('كلمة المرور الجديدة'), 'new123')
    await user.type(screen.getByLabelText('تأكيد كلمة المرور الجديدة'), 'diff456')
    await user.click(screen.getByRole('button', { name: 'حفظ كلمة المرور' }))

    expect(screen.getByText('تأكيد كلمة المرور غير مطابق')).toBeInTheDocument()

    // Close sheet
    await user.click(screen.getByRole('button', { name: 'إلغاء' }))
    expect(screen.queryByLabelText('كلمة المرور الحالية')).not.toBeInTheDocument()
  })
})
