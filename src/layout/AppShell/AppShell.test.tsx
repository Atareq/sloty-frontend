import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { Link, MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from '../../core/auth/useAuth'
import { PageActions } from '../../shared/components/PageActions/PageActions'
import { AppSheet } from '../../shared/components/AppSheet/AppSheet'
import { AppShell } from './AppShell'

vi.mock('../../core/auth/useAuth', () => ({
  useAuth: vi.fn(),
}))

const mockedUseAuth = vi.mocked(useAuth)
const clearSelectedClub = vi.fn()

function SheetHarness() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <p>سجل الحجوزات</p>
      <button onClick={() => setIsOpen(true)} type="button">
        افتح مهمة
      </button>
      <AppSheet
        ariaLabel="مهمة حجز"
        isOpen={isOpen}
        onRequestClose={() => setIsOpen(false)}
      >
        محتوى المهمة
      </AppSheet>
    </>
  )
}

function getAuthValue(
  membershipCount = 2,
  options: {
    canManageSettlements?: boolean
    role?: 'OWNER' | 'MANAGER' | 'STAFF' | 'PLATFORM_ADMIN'
  } = {},
) {
  const role = options.role ?? 'MANAGER'
  const membershipRole = role === 'PLATFORM_ADMIN' ? 'OWNER' : role
  const selectedMembership = {
    id: 10,
    role: membershipRole,
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
  const memberships = Array.from({ length: membershipCount }, (_, index) => ({
    ...selectedMembership,
    id: selectedMembership.id + index,
    club: {
      ...selectedMembership.club,
      id: selectedMembership.club.id + index,
      slug:
        index === 0 ? selectedMembership.club.slug : `second-club-${index}`,
    },
  }))
  const isPlatformAdmin = role === 'PLATFORM_ADMIN'

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
      is_platform_admin: isPlatformAdmin,
      account_created_by: null,
      requires_club_selection: !isPlatformAdmin && membershipCount > 1,
      memberships: isPlatformAdmin ? [] : memberships,
    },
    selectedClubSlug: isPlatformAdmin ? null : selectedMembership.club.slug,
    selectedMembership: isPlatformAdmin ? null : selectedMembership,
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
          <Route element={<p>الجدول</p>} path="/schedule" />
          <Route element={<SheetHarness />} path="/bookings" />
          <Route element={<p>سجل المعاملات المالية</p>} path="/transactions" />
          <Route
            element={
              <PageActions>
                <Link to="/admin/clubs/new">إضافة نادي</Link>
              </PageActions>
            }
            path="/admin/clubs"
          />
          <Route element={<p>المستخدمون</p>} path="/admin/users" />
          <Route
            element={<p>تفاصيل التسوية</p>}
            path="/settlements/:settlementId"
          />
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

  it('renders the shell page heading once without feature title duplication', () => {
    renderAppShell()

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: 'لوحة التحكم' }))
      .toBeInTheDocument()
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

  it('shows settlement navigation for own-view roles and management-capable roles', () => {
    mockedUseAuth.mockReturnValue(getAuthValue(2, { role: 'OWNER' }))

    renderAppShell()

    expect(screen.getAllByText('عهد الموظفين').length)
      .toBeGreaterThan(0)

    cleanup()
    mockedUseAuth.mockReturnValue(getAuthValue())

    renderAppShell()

    expect(screen.getAllByText('عهدتي').length)
      .toBeGreaterThan(0)

    cleanup()
    mockedUseAuth.mockReturnValue(getAuthValue(2, { role: 'STAFF' }))

    renderAppShell()

    expect(screen.getAllByText('عهدتي').length)
      .toBeGreaterThan(0)

    cleanup()
    mockedUseAuth.mockReturnValue(
      getAuthValue(2, { canManageSettlements: true }),
    )

    renderAppShell()

    expect(screen.getAllByText('عهد الموظفين').length)
      .toBeGreaterThan(0)
  })

  it('removes the mobile footer and shows the reused booking action', () => {
    renderAppShell()

    expect(screen.queryByRole('navigation', { name: 'تنقل الموظف' }))
      .not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'حجز جديد' }))
      .toBeInTheDocument()
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
      'التحصيلات',
      'عهد الموظفين',
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
    expect(within(dialog).queryByRole('button', { name: 'الحجوزات الأسبوعية' }))
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
      'التحصيلات',
      'عهد الموظفين',
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
    expect(within(sidebar).queryByRole('link', { name: /الحجوزات الأسبوعية/ }))
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
    expect(within(dialog).getByRole('button', { name: 'التحصيلات' }))
      .toBeInTheDocument()

    await user.click(
      within(dialog).getByRole('button', { name: 'التحصيلات' }),
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'التحصيلات' }))
      .toBeInTheDocument()
  })

  it('closes the mobile drawer from its X and browser Back', async () => {
    const user = userEvent.setup()

    renderAppShell()
    await user.click(screen.getByRole('button', { name: 'فتح القائمة' }))
    expect(screen.queryByRole('button', { name: 'حجز جديد' }))
      .not.toBeInTheDocument()

    const closeButtons = screen.getAllByRole('button', {
      name: 'إغلاق القائمة',
    })
    await user.click(closeButtons.at(-1)!)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'فتح القائمة' }))
    window.history.back()
    expect(await screen.findByRole('button', { name: 'حجز جديد' }))
      .toBeInTheDocument()
  })

  it('navigates the global booking action to Schedule and hides it for AppSheet tasks', async () => {
    const user = userEvent.setup()

    renderAppShell()
    await user.click(screen.getByRole('button', { name: 'حجز جديد' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'الجدول' }))
      .toBeInTheDocument()

    cleanup()
    renderAppShell('/bookings')
    expect(screen.getByRole('button', { name: 'حجز جديد' }))
      .toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'افتح مهمة' }))
    expect(screen.getByRole('dialog', { name: 'مهمة حجز' }))
      .toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'حجز جديد' }))
      .not.toBeInTheDocument()
  })

  it('updates route title when navigating between routes', async () => {
    const user = userEvent.setup()

    renderAppShell()

    await user.click(screen.getByRole('button', { name: 'فتح القائمة' }))
    await user.click(
      screen.getByRole('button', { name: 'التحصيلات' }),
    )

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'التحصيلات',
      }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })

  it('renders dynamic detail route metadata intentionally', () => {
    renderAppShell('/settlements/42')

    expect(screen.getByRole('heading', { level: 1, name: 'تفاصيل التسوية' }))
      .toBeInTheDocument()
  })

  it('keeps migrated page actions visible once below the shell header', () => {
    mockedUseAuth.mockReturnValue(getAuthValue(0, { role: 'PLATFORM_ADMIN' }))

    renderAppShell('/admin/clubs')

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: 'إدارة الأندية' }))
      .toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'إضافة نادي' })).toHaveLength(1)
  })

  it('keeps staff menu limited to allowed operational links and account actions', async () => {
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
    expect(within(dialog).getByRole('button', { name: 'تحصيلاتي' }))
      .toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'عهدتي' }))
      .toBeInTheDocument()
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
    expect(screen.getByRole('button', { name: 'حجز جديد' }))
      .toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'فتح القائمة' }))
    await user.click(screen.getByRole('button', { name: 'عرض سطح المكتب' }))

    expect(window.localStorage.getItem('sloty:view-mode')).toBe('desktop')
    expect(screen.getByLabelText('هيكل تطبيق سلوتي'))
      .toHaveAttribute('data-view-mode', 'desktop')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'فتح القائمة' }))
      .not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'حجز جديد' }))
      .not.toBeInTheDocument()
  })

  it('defaults to mobile view when no saved view mode exists', () => {
    renderAppShell()

    expect(window.localStorage.getItem('sloty:view-mode')).toBeNull()
    expect(screen.getByLabelText('هيكل تطبيق سلوتي'))
      .toHaveAttribute('data-view-mode', 'mobile')
    expect(screen.getByRole('button', { name: 'فتح القائمة' }))
      .toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'حجز جديد' }))
      .toBeInTheDocument()
  })

  it('ignores invalid saved view mode values and resets them to mobile', () => {
    window.localStorage.setItem('sloty:view-mode', 'tablet')

    renderAppShell()

    expect(window.localStorage.getItem('sloty:view-mode')).toBe('mobile')
    expect(screen.getByLabelText('هيكل تطبيق سلوتي'))
      .toHaveAttribute('data-view-mode', 'mobile')
    expect(screen.getByRole('button', { name: 'فتح القائمة' }))
      .toBeInTheDocument()
  })

  it('respects an explicit desktop view preference', () => {
    window.localStorage.setItem('sloty:view-mode', 'desktop')

    renderAppShell()

    expect(screen.getByLabelText('هيكل تطبيق سلوتي'))
      .toHaveAttribute('data-view-mode', 'desktop')
    expect(screen.queryByRole('button', { name: 'فتح القائمة' }))
      .not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'حجز جديد' }))
      .not.toBeInTheDocument()
  })

  it('renders a visible mobile recovery action in desktop view', () => {
    window.localStorage.setItem('sloty:view-mode', 'desktop')

    renderAppShell()

    expect(screen.getByRole('button', { name: 'عرض الهاتف' }))
      .toBeInTheDocument()
  })

  it('switches desktop view back to mobile and stores the mobile preference', async () => {
    const user = userEvent.setup()

    window.localStorage.setItem('sloty:view-mode', 'desktop')

    renderAppShell()

    await user.click(screen.getByRole('button', { name: 'عرض الهاتف' }))

    expect(window.localStorage.getItem('sloty:view-mode')).toBe('mobile')
    expect(screen.getByLabelText('هيكل تطبيق سلوتي'))
      .toHaveAttribute('data-view-mode', 'mobile')
    expect(screen.getByRole('button', { name: 'فتح القائمة' }))
      .toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'حجز جديد' }))
      .toBeInTheDocument()
  })

  it('never traps desktop view without a visible way back to mobile', () => {
    window.localStorage.setItem('sloty:view-mode', 'desktop')

    renderAppShell()

    expect(screen.getByLabelText('هيكل تطبيق سلوتي'))
      .toHaveAttribute('data-view-mode', 'desktop')
    expect(screen.queryByRole('button', { name: 'فتح القائمة' }))
      .not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'عرض الهاتف' }))
      .toBeInTheDocument()
  })

  it('shows platform admin drawer links and hides the club-user bottom nav', async () => {
    const user = userEvent.setup()

    mockedUseAuth.mockReturnValue(getAuthValue(0, { role: 'PLATFORM_ADMIN' }))

    renderAppShell('/admin/users')

    expect(screen.getByLabelText('هيكل تطبيق سلوتي'))
      .toHaveAttribute('data-view-mode', 'mobile')
    expect(screen.getByRole('button', { name: 'فتح القائمة' }))
      .toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'حجز جديد' }))
      .not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'فتح القائمة' }))

    const dialog = screen.getByRole('dialog')

    expect(within(dialog).getByText('إدارة المنصة')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'الأندية' }))
      .toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'المستخدمون' }))
      .toBeInTheDocument()
  })

  it('shows platform admin desktop sidebar logout', async () => {
    const user = userEvent.setup()
    const logout = vi.fn()

    window.localStorage.setItem('sloty:view-mode', 'desktop')
    mockedUseAuth.mockReturnValue({
      ...getAuthValue(0, { role: 'PLATFORM_ADMIN' }),
      logout,
    })

    renderAppShell('/admin/users')

    const sidebar = screen.getByRole('navigation', { name: 'تنقل التطبيق' })

    expect(within(sidebar).getByRole('link', { name: /الأندية/ }))
      .toBeInTheDocument()
    expect(within(sidebar).getByRole('link', { name: /المستخدمون/ }))
      .toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'تسجيل الخروج' }))

    expect(logout).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('تسجيل الدخول')).toBeInTheDocument()
  })

  it('keeps the desktop view toggle inside the mobile drawer in mobile mode', async () => {
    const user = userEvent.setup()

    renderAppShell()

    await user.click(screen.getByRole('button', { name: 'فتح القائمة' }))

    const dialog = screen.getByRole('dialog')

    expect(within(dialog).getByRole('button', { name: 'عرض سطح المكتب' }))
      .toBeInTheDocument()
  })

  it('opens the owner overview dashboard in mobile view on a fresh load', () => {
    mockedUseAuth.mockReturnValue(getAuthValue(2, { role: 'OWNER' }))

    renderAppShell('/dashboard')

    expect(screen.getByLabelText('هيكل تطبيق سلوتي'))
      .toHaveAttribute('data-view-mode', 'mobile')
    expect(screen.getByRole('button', { name: 'فتح القائمة' }))
      .toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'حجز جديد' }))
      .toBeInTheDocument()
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

  it('clears standard success feedback after three seconds', () => {
    vi.useFakeTimers()
    renderAppShell({
      pathname: '/dashboard',
      state: { flashMessage: 'تم الحفظ بنجاح' },
    })

    expect(screen.getByText('تم الحفظ بنجاح')).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(3000))
    expect(screen.queryByText('تم الحفظ بنجاح')).not.toBeInTheDocument()
    vi.useRealTimers()
  })
})
