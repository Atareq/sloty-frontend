import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from '../../core/auth/useAuth'
import { AppShell } from './AppShell'

vi.mock('../../core/auth/useAuth', () => ({
  useAuth: vi.fn(),
}))

const mockedUseAuth = vi.mocked(useAuth)
const clearSelectedClub = vi.fn()

function getAuthValue(
  membershipCount = 2,
  options: {
    canManageSettlements?: boolean
    role?: 'OWNER' | 'MANAGER' | 'STAFF'
  } = {},
) {
  const role = options.role ?? 'MANAGER'
  const selectedMembership = {
    id: 10,
    role,
    club: {
      id: 1,
      name: 'Demo Football Club',
      slug: 'demo-football-club',
      city: 'ASSIUT',
      is_active: true,
    },
    court: null,
    can_manage_settlements: options.canManageSettlements ?? false,
  }

  return {
    accessToken: 'token',
    claims: { user_id: 1, role, name: 'Manager User' },
    currentUser: {
      id: 1,
      username: 'manager-user',
      email: 'manager@example.com',
      first_name: 'Manager',
      last_name: 'User',
      phone_number: null,
      is_active: true,
      is_platform_admin: false,
      requires_club_selection: membershipCount > 1,
      memberships: Array.from({ length: membershipCount }, (_, index) => ({
        ...selectedMembership,
        id: selectedMembership.id + index,
        club: {
          ...selectedMembership.club,
          id: selectedMembership.club.id + index,
          slug:
            index === 0
              ? selectedMembership.club.slug
              : `second-club-${index}`,
        },
      })),
    },
    selectedClubSlug: selectedMembership.club.slug,
    selectedMembership,
    role,
    isAuthenticated: true,
    isLoadingSession: false,
    isTokenExpired: false,
    sessionError: null,
    login: vi.fn(),
    logout: vi.fn(),
    selectClub: vi.fn(),
    clearSelectedClub,
    refreshCurrentUser: vi.fn(),
    setTokens: vi.fn(),
  }
}

function renderAppShell(
  initialEntry:
    | string
    | { pathname: string; state?: Record<string, unknown> } = '/dashboard',
) {
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route element={<AppShell />}>
          <Route element={<p>لوحة التحكم</p>} path="/dashboard" />
          <Route element={<p>سجل المعاملات المالية</p>} path="/transactions" />
        </Route>
        <Route element={<p>اختيار النادي</p>} path="/select-club" />
        <Route element={<p>تسجيل الدخول</p>} path="/login" />
      </Routes>
    </MemoryRouter>,
  )
}

describe('AppShell', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
    mockedUseAuth.mockReturnValue(getAuthValue())
  })

  it('shows the selected club name', () => {
    renderAppShell()

    expect(screen.getAllByText('النادي الحالي: Demo Football Club').length)
      .toBeGreaterThan(0)
  })

  it('shows change-club action only for multi-club users', () => {
    renderAppShell()

    expect(screen.queryByRole('button', { name: 'تغيير النادي' }))
      .not.toBeInTheDocument()

    cleanup()
    mockedUseAuth.mockReturnValue(getAuthValue(1))

    renderAppShell()

    expect(screen.queryByRole('button', { name: 'تغيير النادي' }))
      .not.toBeInTheDocument()
  })

  it('clears selected club and navigates to club selection', async () => {
    const user = userEvent.setup()

    renderAppShell()

    await user.click(screen.getByRole('button', { name: 'فتح القائمة' }))
    await user.click(screen.getByRole('button', { name: 'تغيير النادي' }))

    expect(clearSelectedClub).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('اختيار النادي')).toBeInTheDocument()
  })

  it('shows settlement navigation only when the selected membership allows it', () => {
    mockedUseAuth.mockReturnValue(getAuthValue(2, { role: 'OWNER' }))

    renderAppShell()

    expect(screen.getAllByText('التسويات المالية والجرد').length)
      .toBeGreaterThan(0)

    cleanup()
    mockedUseAuth.mockReturnValue(getAuthValue())

    renderAppShell()

    expect(screen.queryByText('التسويات المالية والجرد'))
      .not.toBeInTheDocument()

    cleanup()
    mockedUseAuth.mockReturnValue(
      getAuthValue(2, { canManageSettlements: true }),
    )

    renderAppShell()

    expect(screen.getAllByText('التسويات المالية والجرد').length)
      .toBeGreaterThan(0)
  })

  it('renders exactly the three approved mobile footer items', () => {
    renderAppShell()

    const footer = screen.getByRole('navigation', { name: 'تنقل الموظف' })
    const footerItems = within(footer).getAllByRole('button')

    expect(footerItems).toHaveLength(3)
    expect(footerItems[0]).toHaveAccessibleName('لوحة التحكم')
    expect(footerItems[1]).toHaveAccessibleName('الجدول')
    expect(footerItems[2]).toHaveAccessibleName('سجل الحجوزات')

    for (const hiddenLabel of [
      'المزيد',
      'سجل المعاملات المالية',
      'التسويات المالية والجرد',
      'التقارير الاستهلاكية للملاعب',
      'الإعدادات',
      'إعدادات الملاعب',
      'المستخدمون والصلاحيات',
      'سجل النشاطات',
    ]) {
      expect(within(footer).queryByRole('button', { name: hiddenLabel }))
        .not.toBeInTheDocument()
    }
  })

  it('keeps owner drawer navigation to direct primary items only', async () => {
    const user = userEvent.setup()

    mockedUseAuth.mockReturnValue(getAuthValue(2, { role: 'OWNER' }))

    renderAppShell()

    await user.click(screen.getByRole('button', { name: 'فتح القائمة' }))
    const dialog = screen.getByRole('dialog')

    for (const label of [
      'لوحة التحكم',
      'الجدول',
      'سجل الحجوزات',
      'سجل المعاملات المالية',
      'التسويات المالية والجرد',
      'التقارير الاستهلاكية للملاعب',
      'الإعدادات',
    ]) {
      expect(within(dialog).getByRole('button', { name: label }))
        .toBeInTheDocument()
    }

    expect(within(dialog).queryByRole('button', { name: 'إعدادات الملاعب' }))
      .not.toBeInTheDocument()
    expect(
      within(dialog).queryByRole('button', {
        name: 'المستخدمون والصلاحيات',
      }),
    ).not.toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: 'سجل النشاطات' }))
      .not.toBeInTheDocument()
  })

  it('keeps desktop sidebar navigation to direct primary items only', () => {
    window.localStorage.setItem('sloty:view-mode', 'desktop')
    mockedUseAuth.mockReturnValue(getAuthValue(2, { role: 'OWNER' }))

    renderAppShell()

    const sidebar = screen.getByRole('navigation', { name: 'تنقل التطبيق' })

    for (const label of [
      'لوحة التحكم',
      'الجدول',
      'سجل الحجوزات',
      'سجل المعاملات المالية',
      'التسويات المالية والجرد',
      'التقارير الاستهلاكية للملاعب',
      'الإعدادات',
    ]) {
      expect(within(sidebar).getByRole('link', { name: label }))
        .toBeInTheDocument()
    }

    expect(within(sidebar).queryByRole('link', { name: /إعدادات الملاعب/ }))
      .not.toBeInTheDocument()
    expect(
      within(sidebar).queryByRole('link', {
        name: /المستخدمون والصلاحيات/,
      }),
    ).not.toBeInTheDocument()
    expect(within(sidebar).queryByRole('link', { name: /سجل النشاطات/ }))
      .not.toBeInTheDocument()
  })

  it('opens the hamburger menu and closes it after navigation', async () => {
    const user = userEvent.setup()

    renderAppShell()

    await user.click(screen.getByRole('button', { name: 'فتح القائمة' }))

    const dialog = screen.getByRole('dialog')

    expect(dialog).toBeInTheDocument()
    expect(within(dialog).getByText('القائمة')).toBeInTheDocument()
    expect(within(dialog).getByText('التشغيل اليومي')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'سجل المعاملات المالية' }))
      .toBeInTheDocument()

    await user.click(
      within(dialog).getByRole('button', { name: 'سجل المعاملات المالية' }),
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'سجل المعاملات المالية' }))
      .toBeInTheDocument()
  })

  it('keeps staff menu limited to daily links and account actions', async () => {
    const user = userEvent.setup()

    mockedUseAuth.mockReturnValue(getAuthValue(1, { role: 'STAFF' }))

    renderAppShell()

    await user.click(screen.getByRole('button', { name: 'فتح القائمة' }))
    const dialog = screen.getByRole('dialog')

    expect(within(dialog).getByRole('button', { name: 'لوحة التحكم' }))
      .toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'الجدول' }))
      .toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'سجل الحجوزات' }))
      .toBeInTheDocument()
    expect(within(dialog).queryByText('سجل المعاملات المالية'))
      .not.toBeInTheDocument()
    expect(within(dialog).queryByText('التسويات المالية والجرد'))
      .not.toBeInTheDocument()
    expect(within(dialog).queryByText('التقارير الاستهلاكية للملاعب'))
      .not.toBeInTheDocument()
    expect(within(dialog).queryByText('سجل النشاطات')).not.toBeInTheDocument()
    expect(within(dialog).queryByText('الإعدادات')).not.toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'تسجيل الخروج' }))
      .toBeInTheDocument()
  })

  it('keeps logout in the menu instead of the visible header', async () => {
    const user = userEvent.setup()
    const logout = vi.fn()

    mockedUseAuth.mockReturnValue({ ...getAuthValue(), logout })

    renderAppShell()

    expect(screen.queryByRole('button', { name: 'تسجيل الخروج' }))
      .not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'فتح القائمة' }))
    await user.click(screen.getByRole('button', { name: 'تسجيل الخروج' }))

    expect(logout).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('تسجيل الدخول')).toBeInTheDocument()
  })

  it('stores desktop view preference and hides the mobile footer', async () => {
    const user = userEvent.setup()

    renderAppShell()

    expect(screen.getByLabelText('هيكل تطبيق سلوتي'))
      .toHaveAttribute('data-view-mode', 'mobile')
    expect(screen.getByRole('navigation', { name: 'تنقل الموظف' }))
      .toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'فتح القائمة' }))
    await user.click(screen.getByRole('button', { name: 'عرض سطح المكتب' }))

    expect(window.localStorage.getItem('sloty:view-mode')).toBe('desktop')
    expect(screen.getByLabelText('هيكل تطبيق سلوتي'))
      .toHaveAttribute('data-view-mode', 'desktop')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'فتح القائمة' }))
      .not.toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'تنقل الموظف' }))
      .not.toBeInTheDocument()
  })

  it('hides the header menu button and drawer when desktop view is active', () => {
    window.localStorage.setItem('sloty:view-mode', 'desktop')

    renderAppShell()

    expect(screen.queryByRole('button', { name: 'فتح القائمة' }))
      .not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'تنقل الموظف' }))
      .not.toBeInTheDocument()
  })

  it('shows and dismisses a route-state flash message', async () => {
    const user = userEvent.setup()

    renderAppShell({
      pathname: '/dashboard',
      state: { flashMessage: 'تم تحديث مواعيد العمل بنجاح' },
    })

    expect(await screen.findByText('تم تحديث مواعيد العمل بنجاح'))
      .toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'إغلاق' }))

    expect(screen.queryByText('تم تحديث مواعيد العمل بنجاح'))
      .not.toBeInTheDocument()
  })
})
