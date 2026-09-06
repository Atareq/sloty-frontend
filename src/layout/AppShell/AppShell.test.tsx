import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState, type ReactNode } from 'react'
import { Link, MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from '../../core/auth/useAuth'
import { PageActions } from '../../shared/components/PageActions/PageActions'
import { AppSheet } from '../../shared/components/AppSheet/AppSheet'
import { HEADER_COLLAPSE_END_PX } from '../../shared/hooks/usePageHeaderScroll'
import type { OfflineSyncContextValue } from '../../offline/sync/offlineSyncContext'
import { AppShell } from './AppShell'

vi.mock('../../core/auth/useAuth', () => ({
  useAuth: vi.fn(),
}))

const offlineSyncContextValue = vi.hoisted<OfflineSyncContextValue>(() => ({
  connectivity: {
    browserNetwork: 'likely_online' as const,
    backendReachability: 'reachable' as const,
    lastConnectivityChangeAt: null,
    lastBrowserEvent: null,
    eventVersion: 0,
  },
  freshness: {
    ageMs: 60 * 60 * 1000,
    canCreateNewOfflineRequest: true,
    isLoading: false,
    lastSuccessfulOperationalSyncAt: '2026-09-04T11:00:00.000Z',
    level: 'fresh' as const,
    warningText: null,
  },
  requestSync: vi.fn(),
  sync: {
    status: 'idle' as const,
    activeScopeKey: null,
    activeDataset: null,
    lastRunStartedAt: null,
    lastRunCompletedAt: null,
    lastRunResult: null,
    backendReachability: 'reachable' as const,
  },
}))

vi.mock('../../offline/sync/OfflineSyncProvider', () => ({
  OfflineSyncProvider: ({ children }: { children: ReactNode }) => children,
}))

vi.mock('../../offline/sync/offlineSyncContext', () => ({
  useOfflineSync: () => offlineSyncContextValue,
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
    court: role === 'STAFF' ? { id: 7, name: 'ملعب 1' } : null,
    can_manage_settlements: options.canManageSettlements ?? false,
    permissions: {
      can_change_pricing: false,
      can_manage_working_hours: false,
      can_manage_settlements: options.canManageSettlements ?? false,
    },
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
      first_name: 'محمد',
      last_name: 'أحمد',
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
    | { pathname: string; state?: Record<string, unknown> } = '/schedule',
) {
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route element={<AppShell />}>
          <Route element={<p>محتوى الرئيسية</p>} path="/schedule" />
          <Route element={<p>المتابعة</p>} path="/dashboard" />
          <Route element={<SheetHarness />} path="/bookings" />
          <Route element={<p>سجل المعاملات المالية</p>} path="/transactions" />
          <Route element={<p>المبالغ مع الموظفين</p>} path="/settlements" />
          <Route element={<p>التقارير</p>} path="/reports" />
          <Route element={<p>الإعدادات</p>} path="/settings" />
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
    offlineSyncContextValue.connectivity.browserNetwork = 'likely_online'
    offlineSyncContextValue.connectivity.backendReachability = 'reachable'
    offlineSyncContextValue.freshness.ageMs = 60 * 60 * 1000
    offlineSyncContextValue.freshness.canCreateNewOfflineRequest = true
    offlineSyncContextValue.freshness.isLoading = false
    offlineSyncContextValue.freshness.level = 'fresh'
    offlineSyncContextValue.freshness.warningText = null
    window.localStorage.clear()
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 0,
    })
    window.scrollTo = vi.fn(
      (xOrOptions?: number | ScrollToOptions, y?: number) => {
        const nextY =
          typeof xOrOptions === 'object' && xOrOptions !== null
            ? Number(xOrOptions.top ?? 0)
            : Number(y ?? 0)

        Object.defineProperty(window, 'scrollY', {
          configurable: true,
          value: Number.isFinite(nextY) ? nextY : 0,
        })
      },
    ) as typeof window.scrollTo
    mockedUseAuth.mockReturnValue(getAuthValue())
  })

  it('shows the selected club name', () => {
    renderAppShell()

    expect(screen.getAllByText('النادي الحالي: Demo Football Club').length)
      .toBeGreaterThan(0)
  })

  it('shows one offline freshness warning in the shell when cached data is stale', () => {
    offlineSyncContextValue.connectivity.browserNetwork = 'offline'
    offlineSyncContextValue.connectivity.backendReachability = 'unreachable'
    offlineSyncContextValue.freshness.ageMs = 13 * 60 * 60 * 1000
    offlineSyncContextValue.freshness.level = 'stale_warning'
    offlineSyncContextValue.freshness.warningText =
      'البيانات المحفوظة بقالها أكتر من 12 ساعة.\nاتصل بالإنترنت علشان تحدّث Sloty.'

    renderAppShell()

    expect(
      screen.getByText('البيانات المحفوظة بقالها أكتر من 12 ساعة.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('اتصل بالإنترنت علشان تحدّث Sloty.'),
    ).toBeInTheDocument()
  })

  it('renders the shell page heading once without feature title duplication', () => {
    renderAppShell()

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: 'الرئيسية' }))
      .toBeInTheDocument()
  })

  it('places the mobile burger on the RTL start and Home on the opposite edge', async () => {
    const user = userEvent.setup()

    renderAppShell('/bookings')

    const header = screen.getByRole('banner')
    const startActions = header.querySelector(
      '[data-page-header-actions="start"]',
    )
    const endActions = header.querySelector('[data-page-header-actions="end"]')
    const menuButton = within(header).getByRole('button', {
      name: 'فتح القائمة',
    })
    const homeButton = within(header).getByRole('button', { name: 'الرئيسية' })

    expect(header).toHaveAttribute('dir', 'rtl')
    expect(header).toHaveAttribute('data-header-scroll-state', 'expanded')
    expect(header).not.toHaveClass('sticky')
    expect(header.querySelector('[data-page-header-context]')).toHaveClass(
      'sloty-green-surface',
    )
    expect(header.querySelector('.sloty-page-header-controls')).toHaveClass(
      'sticky',
      'top-0',
    )
    expect(startActions?.parentElement?.firstElementChild).toBe(startActions)
    expect(startActions?.parentElement?.lastElementChild).toBe(endActions)
    expect(startActions).toContainElement(menuButton)
    expect(endActions).toContainElement(homeButton)
    expect(startActions).not.toContainElement(homeButton)

    await user.click(menuButton)

    const dialog = screen.getByRole('dialog', { name: 'قائمة التنقل' })
    const drawer = dialog.querySelector('aside')

    expect(drawer).toHaveClass('right-0')
    expect(drawer).not.toHaveClass('left-0')
  })

  it('keeps desktop sidebar navigation and omits the mobile burger', () => {
    window.localStorage.setItem('sloty:view-mode', 'desktop')

    renderAppShell('/bookings')

    const header = screen.getByRole('banner')
    const sidebar = screen.getByRole('navigation', { name: 'تنقل التطبيق' })

    expect(screen.queryByRole('button', { name: 'فتح القائمة' }))
      .not.toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'قائمة التنقل' }))
      .not.toBeInTheDocument()
    expect(header.querySelector('[data-page-header-actions="start"]')
      ?.childElementCount).toBe(0)
    expect(within(header).getByRole('button', { name: 'الرئيسية' }))
      .toBeInTheDocument()
    expect(within(sidebar).getByRole('link', { name: /الرئيسية/ }))
      .toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'عرض الهاتف' }))
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

    expect(screen.getAllByText('إدارة الأموال').length)
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
    expect(screen.getAllByText('معاملاتي المالية').length)
      .toBeGreaterThan(0)
    expect(screen.queryByText('إدارة الأموال')).not.toBeInTheDocument()

    cleanup()
    mockedUseAuth.mockReturnValue(
      getAuthValue(2, { canManageSettlements: true }),
    )

    renderAppShell()

    expect(screen.getAllByText('إدارة الأموال').length)
      .toBeGreaterThan(0)
    expect(screen.queryByText('التحصيلات')).not.toBeInTheDocument()
    expect(screen.queryByText('مبالغ الموظفين')).not.toBeInTheDocument()
    expect(screen.queryByText('عهد الموظفين')).not.toBeInTheDocument()
  })

  it('removes the mobile footer and shows the reused booking action', () => {
    renderAppShell()

    expect(screen.queryByRole('navigation', { name: 'تنقل الموظف' }))
      .not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'حجز جديد' }))
      .not.toBeInTheDocument()
  })

  it('keeps owner drawer navigation to direct primary items only', async () => {
    const user = userEvent.setup()

    mockedUseAuth.mockReturnValue(getAuthValue(2, { role: 'OWNER' }))

    renderAppShell()

    await user.click(screen.getByRole('button', { name: 'فتح القائمة' }))
    const dialog = screen.getByRole('dialog')

    for (const label of [
      'الرئيسية',
      'سجل الحجوزات',
      'إدارة الأموال',
      'التقارير',
      'الإعدادات',
    ]) {
      expect(within(dialog).getByRole('link', { name: label }))
        .toBeInTheDocument()
    }

    expect(within(dialog).queryByRole('link', { name: 'التحصيلات' }))
      .not.toBeInTheDocument()
    expect(within(dialog).queryByRole('link', { name: 'مبالغ الموظفين' }))
      .not.toBeInTheDocument()
    expect(within(dialog).queryByRole('link', { name: 'عهد الموظفين' }))
      .not.toBeInTheDocument()
    expect(within(dialog).queryByRole('link', { name: 'سجل المعاملات المالية' }))
      .not.toBeInTheDocument()

    expect(within(dialog).queryByRole('link', { name: 'إعدادات الملاعب' }))
      .not.toBeInTheDocument()
    expect(
      within(dialog).queryByRole('link', {
        name: 'المستخدمون والصلاحيات',
      }),
    ).not.toBeInTheDocument()
    expect(within(dialog).queryByRole('link', { name: 'سجل النشاط' }))
      .not.toBeInTheDocument()
    expect(within(dialog).queryByRole('link', { name: 'الحجوزات الأسبوعية' }))
      .not.toBeInTheDocument()
  })

  it('keeps desktop sidebar navigation to direct primary items only', () => {
    window.localStorage.setItem('sloty:view-mode', 'desktop')
    mockedUseAuth.mockReturnValue(getAuthValue(2, { role: 'OWNER' }))

    renderAppShell()

    const sidebar = screen.getByRole('navigation', { name: 'تنقل التطبيق' })

    for (const label of [
      'الرئيسية',
      'سجل الحجوزات',
      'إدارة الأموال',
      'التقارير',
      'الإعدادات',
    ]) {
      expect(within(sidebar).getByRole('link', { name: label }))
        .toBeInTheDocument()
    }

    expect(within(sidebar).queryByRole('link', { name: 'التحصيلات' }))
      .not.toBeInTheDocument()
    expect(within(sidebar).queryByRole('link', { name: 'مبالغ الموظفين' }))
      .not.toBeInTheDocument()

    expect(within(sidebar).queryByRole('link', { name: /إعدادات الملاعب/ }))
      .not.toBeInTheDocument()
    expect(
      within(sidebar).queryByRole('link', {
        name: /المستخدمون والصلاحيات/,
      }),
    ).not.toBeInTheDocument()
    expect(within(sidebar).queryByRole('link', { name: /سجل النشاط/ }))
      .not.toBeInTheDocument()
    expect(within(sidebar).queryByRole('link', { name: /الحجوزات الأسبوعية/ }))
      .not.toBeInTheDocument()
  })

  it('opens the hamburger menu and closes it after navigation', async () => {
    const user = userEvent.setup()

    mockedUseAuth.mockReturnValue(getAuthValue(2, { role: 'OWNER' }))
    renderAppShell()

    await user.click(screen.getByRole('button', { name: 'فتح القائمة' }))

    const dialog = screen.getByRole('dialog')

    expect(dialog).toBeInTheDocument()
    expect(within(dialog).getByText('محمد أحمد')).toBeInTheDocument()
    expect(within(dialog).getByText('Demo Football Club')).toBeInTheDocument()
    expect(within(dialog).getByText('مالك')).toBeInTheDocument()
    expect(within(dialog).queryByText('القائمة')).not.toBeInTheDocument()
    expect(within(dialog).queryByText('التشغيل اليومي')).not.toBeInTheDocument()
    expect(within(dialog).queryByText('التحصيل والعهد')).not.toBeInTheDocument()
    expect(within(dialog).getByRole('link', { name: 'إدارة الأموال' }))
      .toBeInTheDocument()
    expect(within(dialog).queryByText('ر')).not.toBeInTheDocument()

    await user.click(
      within(dialog).getByRole('link', { name: 'إدارة الأموال' }),
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'إدارة الأموال' }))
      .toBeInTheDocument()
  })

  it('closes the mobile drawer from its X and browser Back', async () => {
    const user = userEvent.setup()

    renderAppShell('/dashboard')
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

  it('navigates the global booking action to Schedule and hides it there and during AppSheet tasks', async () => {
    const user = userEvent.setup()

    renderAppShell('/dashboard')
    await user.click(screen.getByRole('button', { name: 'حجز جديد' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'الرئيسية' }))
      .toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'حجز جديد' }))
      .not.toBeInTheDocument()

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

    mockedUseAuth.mockReturnValue(getAuthValue(2, { role: 'OWNER' }))
    renderAppShell()

    await user.click(screen.getByRole('button', { name: 'فتح القائمة' }))
    await user.click(
      within(screen.getByRole('dialog')).getByRole('link', {
        name: 'إدارة الأموال',
      }),
    )

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'إدارة الأموال',
      }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })

  it('renders dynamic detail route metadata intentionally', () => {
    renderAppShell('/settlements/42')

    expect(screen.getByRole('heading', { level: 1, name: 'تفاصيل الاستلام' }))
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

    expect(within(dialog).getByRole('link', { name: 'الرئيسية' }))
      .toBeInTheDocument()
    expect(within(dialog).queryByRole('link', { name: 'الجدول' }))
      .not.toBeInTheDocument()
    expect(within(dialog).getByRole('link', { name: 'سجل الحجوزات' }))
      .toBeInTheDocument()
    expect(within(dialog).getByRole('link', { name: 'معاملاتي المالية' }))
      .toBeInTheDocument()
    expect(within(dialog).getByRole('link', { name: 'عهدتي' }))
      .toBeInTheDocument()
    expect(within(dialog).getByText('ملعب 1')).toBeInTheDocument()
    expect(within(dialog).getByText('موظف')).toBeInTheDocument()
    expect(within(dialog).queryByRole('link', { name: 'إدارة الأموال' }))
      .not.toBeInTheDocument()
    expect(within(dialog).queryByText('التقارير'))
      .not.toBeInTheDocument()
    expect(within(dialog).queryByText('سجل النشاط')).not.toBeInTheDocument()
    expect(within(dialog).queryByText('الإعدادات')).not.toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'تسجيل الخروج' }))
      .toBeInTheDocument()
  })

  it('keeps logout in the menu instead of the visible header', async () => {
    const user = userEvent.setup()
    const logout = vi.fn().mockResolvedValue(undefined)

    mockedUseAuth.mockReturnValue({ ...getAuthValue(), logout })

    renderAppShell()

    expect(screen.queryByRole('button', { name: 'تسجيل الخروج' }))
      .not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'فتح القائمة' }))
    await user.click(screen.getByRole('button', { name: 'تسجيل الخروج' }))

    const confirmation = screen.getByRole('dialog', {
      name: 'تسجيل الخروج؟',
    })
    expect(within(confirmation).getByText(
      'البيانات المحفوظة على الجهاز للاستخدام بدون إنترنت هتتمسح.',
    )).toBeInTheDocument()
    await user.click(
      within(confirmation).getByRole('button', { name: 'تسجيل الخروج' }),
    )

    expect(logout).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('تسجيل الدخول')).toBeInTheDocument()
  })

  it('stores desktop view preference and hides the mobile footer', async () => {
    const user = userEvent.setup()

    renderAppShell('/bookings')

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
    renderAppShell('/bookings')

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

    renderAppShell('/bookings')

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

    expect(within(dialog).queryByText('إدارة المنصة')).not.toBeInTheDocument()
    expect(within(dialog).getByRole('link', { name: 'الأندية' }))
      .toBeInTheDocument()
    expect(within(dialog).getByRole('link', { name: 'المستخدمون' }))
      .toBeInTheDocument()
  })

  it('shows platform admin desktop sidebar logout', async () => {
    const user = userEvent.setup()
    const logout = vi.fn().mockResolvedValue(undefined)

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

    const confirmation = screen.getByRole('dialog', {
      name: 'تسجيل الخروج؟',
    })
    await user.click(
      within(confirmation).getByRole('button', { name: 'تسجيل الخروج' }),
    )

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

  it('hides the header Home affordance on Home and shows it on other pages', async () => {
    const user = userEvent.setup()

    renderAppShell('/schedule')
    expect(screen.getByRole('heading', { level: 1, name: 'الرئيسية' }))
      .toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'الرئيسية' }))
      .not.toBeInTheDocument()

    cleanup()
    renderAppShell('/dashboard')
    expect(screen.getByRole('heading', { level: 1, name: 'المتابعة' }))
      .toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'الرئيسية' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'الرئيسية' }))
      .toBeInTheDocument()
    expect(screen.getByText('محتوى الرئيسية')).toBeInTheDocument()
  })

  it('keeps Home distinct from sheet Back on Bookings, Transactions, Custody, and Settings', async () => {
    const user = userEvent.setup()

    renderAppShell('/bookings')
    await user.click(screen.getByRole('button', { name: 'افتح مهمة' }))
    expect(screen.getByRole('dialog', { name: 'مهمة حجز' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'الرئيسية' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'الرئيسية' }))
      .toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'مهمة حجز' }))
      .not.toBeInTheDocument()

    cleanup()
    for (const [path, title] of [
      ['/transactions', 'سجل المعاملات المالية'],
      ['/settlements', 'عهدتي'],
      ['/settings', 'الإعدادات'],
    ] as const) {
      renderAppShell(path)
      expect(screen.getByRole('heading', { level: 1, name: title }))
        .toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'الرئيسية' })).toBeInTheDocument()
      cleanup()
    }

    mockedUseAuth.mockReturnValue(getAuthValue(1, { role: 'STAFF' }))
    renderAppShell('/transactions')
    expect(
      screen.getByRole('heading', { level: 1, name: 'معاملاتي المالية' }),
    ).toBeInTheDocument()
    cleanup()
  })

  it('shows the booking FAB on Dashboard and Bookings, and hides it on Home/Schedule', () => {
    renderAppShell('/dashboard')
    expect(screen.getByRole('button', { name: 'حجز جديد' })).toBeInTheDocument()

    cleanup()
    renderAppShell('/bookings')
    expect(screen.getByRole('button', { name: 'حجز جديد' })).toBeInTheDocument()

    cleanup()
    renderAppShell('/schedule')
    expect(screen.queryByRole('button', { name: 'حجز جديد' }))
      .not.toBeInTheDocument()
  })

  it('shows and auto-dismisses a route-state flash message without a Close button', () => {
    vi.useFakeTimers()
    renderAppShell({
      pathname: '/dashboard',
      state: { flashMessage: 'تم تحديث مواعيد العمل بنجاح' },
    })

    expect(screen.getByText('تم تحديث مواعيد العمل بنجاح')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'إغلاق' })).not.toBeInTheDocument()
    act(() => vi.advanceTimersByTime(3000))
    expect(screen.queryByText('تم تحديث مواعيد العمل بنجاح'))
      .not.toBeInTheDocument()
    vi.useRealTimers()
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

  it('collapses page context from window scroll and restores it at the top', async () => {
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0)
      return 1
    })
    vi.stubGlobal('cancelAnimationFrame', () => undefined)

    renderAppShell('/bookings')

    const header = screen.getByRole('banner')
    expect(header).toHaveAttribute('data-header-scroll-state', 'expanded')
    expect(screen.getByRole('heading', { level: 1, name: 'سجل الحجوزات' }))
      .toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'فتح القائمة' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'الرئيسية' })).toBeVisible()

    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: HEADER_COLLAPSE_END_PX,
    })
    await act(async () => {
      window.dispatchEvent(new Event('scroll'))
    })

    expect(header).toHaveAttribute('data-header-scroll-state', 'collapsed')
    expect(screen.queryByRole('heading', { level: 1, name: 'سجل الحجوزات' }))
      .not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'فتح القائمة' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'الرئيسية' })).toBeVisible()

    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 0,
    })
    await act(async () => {
      window.dispatchEvent(new Event('scroll'))
    })

    expect(header).toHaveAttribute('data-header-scroll-state', 'expanded')
    expect(screen.getByRole('heading', { level: 1, name: 'سجل الحجوزات' }))
      .toBeInTheDocument()
    vi.unstubAllGlobals()
  })

  it('keeps Home hidden on الرئيسية after the header context collapses', async () => {
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0)
      return 1
    })
    vi.stubGlobal('cancelAnimationFrame', () => undefined)

    renderAppShell('/schedule')

    expect(screen.getByRole('heading', { level: 1, name: 'الرئيسية' }))
      .toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'الرئيسية' }))
      .not.toBeInTheDocument()

    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: HEADER_COLLAPSE_END_PX,
    })
    await act(async () => {
      window.dispatchEvent(new Event('scroll'))
    })

    expect(screen.getByRole('banner')).toHaveAttribute(
      'data-header-scroll-state',
      'collapsed',
    )
    expect(screen.getByRole('button', { name: 'فتح القائمة' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'الرئيسية' }))
      .not.toBeInTheDocument()
    vi.unstubAllGlobals()
  })

  it('restores expanded header context after route navigation to the top', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0)
      return 1
    })
    vi.stubGlobal('cancelAnimationFrame', () => undefined)

    renderAppShell('/bookings')

    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: HEADER_COLLAPSE_END_PX,
    })
    await act(async () => {
      window.dispatchEvent(new Event('scroll'))
    })
    expect(screen.getByRole('banner')).toHaveAttribute(
      'data-header-scroll-state',
      'collapsed',
    )

    await user.click(screen.getByRole('button', { name: 'الرئيسية' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'الرئيسية' }))
      .toBeInTheDocument()
    expect(screen.getByRole('banner')).toHaveAttribute(
      'data-header-scroll-state',
      'expanded',
    )
    vi.unstubAllGlobals()
  })

  it('does not collapse the global header when an AppSheet panel scrolls', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0)
      return 1
    })
    vi.stubGlobal('cancelAnimationFrame', () => undefined)

    renderAppShell('/bookings')
    await user.click(screen.getByRole('button', { name: 'افتح مهمة' }))

    const sheet = screen.getByRole('dialog', { name: 'مهمة حجز' })
    Object.defineProperty(sheet, 'scrollTop', {
      configurable: true,
      value: 240,
    })
    await act(async () => {
      sheet.dispatchEvent(new Event('scroll', { bubbles: true }))
    })

    expect(screen.getByRole('banner')).toHaveAttribute(
      'data-header-scroll-state',
      'expanded',
    )
    expect(screen.getByRole('heading', { level: 1, name: 'سجل الحجوزات' }))
      .toBeInTheDocument()
    vi.unstubAllGlobals()
  })

  it('keeps desktop sidebar navigation after page context collapses', async () => {
    window.localStorage.setItem('sloty:view-mode', 'desktop')
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0)
      return 1
    })
    vi.stubGlobal('cancelAnimationFrame', () => undefined)

    renderAppShell('/bookings')

    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: HEADER_COLLAPSE_END_PX,
    })
    await act(async () => {
      window.dispatchEvent(new Event('scroll'))
    })

    expect(screen.getByRole('banner')).toHaveAttribute(
      'data-header-scroll-state',
      'collapsed',
    )
    expect(screen.queryByRole('button', { name: 'فتح القائمة' }))
      .not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'الرئيسية' })).toBeVisible()
    expect(
      screen.getByRole('navigation', { name: 'تنقل التطبيق' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'عرض الهاتف' })).toBeInTheDocument()
    vi.unstubAllGlobals()
  })
})
