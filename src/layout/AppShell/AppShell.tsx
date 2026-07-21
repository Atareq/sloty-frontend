import { useCallback, useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import {
  canManageSettlements,
  type CurrentUserMembership,
  type CurrentUserProfile,
} from '../../core/auth/auth.types'
import { useAuth } from '../../core/auth/useAuth'
import { MobileBottomNav } from '../../shared/components/MobileBottomNav/MobileBottomNav'
import { PageHeaderSuppressionProvider } from '../../shared/components/PageHeader/PageHeader'
import {
  getNavigationItemsForRole,
  getPageHeaderMeta,
  type NavigationItem,
} from '../../shared/navigation/navigation.config'
import { UnifiedPageHeader } from '../UnifiedPageHeader/UnifiedPageHeader'

const viewModeStorageKey = 'sloty:view-mode'
type ViewMode = 'mobile' | 'desktop'

interface NavigationGroup {
  title: string
  paths: string[]
}

const mobileMenuGroups: NavigationGroup[] = [
  {
    title: 'التشغيل اليومي',
    paths: ['/dashboard', '/schedule', '/bookings'],
  },
  {
    title: 'الأموال والجرد',
    paths: ['/transactions', '/settlements'],
  },
  {
    title: 'الإدارة والمتابعة',
    paths: ['/audit-logs', '/reports', '/settings/courts', '/settings'],
  },
]

function getUserDisplayName(
  currentUser: CurrentUserProfile | null,
  claimName: string | undefined,
): string {
  const profileName = [currentUser?.first_name, currentUser?.last_name]
    .filter(Boolean)
    .join(' ')
    .trim()

  return profileName || currentUser?.username || claimName || 'مستخدم سلوتي'
}

function canShowNavigationItem(
  item: NavigationItem,
  selectedMembership: CurrentUserMembership | null,
): boolean {
  if (item.path === '/settlements') {
    return canManageSettlements(selectedMembership)
  }

  return true
}

function getFlashMessage(locationState: unknown): string | null {
  if (
    locationState &&
    typeof locationState === 'object' &&
    'flashMessage' in locationState
  ) {
    const flashMessage = locationState.flashMessage

    return typeof flashMessage === 'string' ? flashMessage : null
  }

  return null
}

function getStoredViewMode(): ViewMode {
  if (typeof window === 'undefined') {
    return 'mobile'
  }

  return window.localStorage.getItem(viewModeStorageKey) === 'desktop'
    ? 'desktop'
    : 'mobile'
}

/**
 * Role-aware application shell for authenticated Sloty pages.
 *
 * AppShell owns the authenticated chrome: one unified header, the mobile
 * drawer/account menu, desktop navigation, and the three-item mobile footer.
 */
export function AppShell() {
  const {
    claims,
    clearSelectedClub,
    currentUser,
    logout,
    role,
    selectedMembership,
  } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>(getStoredViewMode)
  const pageHeaderMeta = getPageHeaderMeta(location.pathname)
  const desktopItems = useMemo(
    () =>
      role
        ? getNavigationItemsForRole(role).filter((item) =>
            canShowNavigationItem(item, selectedMembership),
          )
        : [],
    [role, selectedMembership],
  )
  const displayName = getUserDisplayName(currentUser, claims?.name)
  const selectedClubName = selectedMembership?.club.name ?? null
  const canChangeClub = (currentUser?.memberships.length ?? 0) > 1
  const flashMessage = getFlashMessage(location.state)
  const shouldUseDesktopNav = viewMode === 'desktop'
  const menuItems = useMemo(
    () =>
      desktopItems.reduce<Record<string, NavigationItem>>(
        (itemsByPath, item) => {
          itemsByPath[item.path] = item

          return itemsByPath
        },
        {},
      ),
    [desktopItems],
  )
  const mobileItems = role
    ? getNavigationItemsForRole(role, { mobileOnly: true })
        .filter((item) => canShowNavigationItem(item, selectedMembership))
        .map((item) => ({
          key: item.path,
          label: item.label,
          marker: item.marker,
          path: item.path,
        }))
    : []

  const clearFlashMessage = useCallback((): void => {
    navigate(`${location.pathname}${location.search}${location.hash}`, {
      replace: true,
      state: null,
    })
  }, [location.hash, location.pathname, location.search, navigate])

  useEffect(() => {
    if (!flashMessage) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      clearFlashMessage()
    }, 3500)

    return () => window.clearTimeout(timeoutId)
  }, [clearFlashMessage, flashMessage])

  function handleLogout(): void {
    setIsMenuOpen(false)
    logout()
    navigate('/login')
  }

  function handleChangeClub(): void {
    setIsMenuOpen(false)
    clearSelectedClub()
    navigate('/select-club')
  }

  function handleMobileNavigation(nextPath: string): void {
    navigate(nextPath)
  }

  function handleMenuNavigation(nextPath: string): void {
    setIsMenuOpen(false)
    navigate(nextPath)
  }

  function handleToggleViewMode(): void {
    setViewMode((currentViewMode) => {
      const nextViewMode = currentViewMode === 'desktop' ? 'mobile' : 'desktop'

      window.localStorage.setItem(viewModeStorageKey, nextViewMode)

      return nextViewMode
    })
  }

  return (
    <div
      aria-label="هيكل تطبيق سلوتي"
      className="min-h-svh bg-[var(--sloty-bg)] text-[var(--sloty-text-primary)]"
      data-view-mode={viewMode}
    >
      <aside
        className={[
          'fixed bottom-0 right-0 top-0 z-40 w-72 flex-col border-l border-[var(--sloty-border)] bg-[var(--sloty-surface)] px-4 py-5 shadow-[var(--sloty-shadow)]',
          shouldUseDesktopNav ? 'flex' : 'hidden lg:flex',
        ].join(' ')}
      >
        <div className="sloty-green-surface rounded-3xl p-4 text-white">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/16 text-xl font-black">
            س
          </div>
          <p className="mt-3 text-lg font-black">Sloty</p>
          <p className="mt-1 text-xs leading-5 text-white/78">
            {displayName}
          </p>
          {selectedClubName ? (
            <p className="mt-3 rounded-2xl bg-white/12 px-3 py-2 text-xs font-bold leading-5 text-white">
              النادي الحالي: {selectedClubName}
            </p>
          ) : null}
        </div>

        <nav
          aria-label="تنقل التطبيق"
          className="mt-5 flex flex-1 flex-col gap-1"
        >
          {desktopItems.map((item) => (
            <NavLink
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-bold transition',
                  isActive
                    ? 'bg-[var(--sloty-soft-mint)] text-[var(--sloty-primary-dark)]'
                    : 'text-[var(--sloty-text-muted)] hover:bg-[var(--sloty-bg)] hover:text-[var(--sloty-text-primary)]',
                ].join(' ')
              }
              key={item.path}
              to={item.path}
            >
              <span
                aria-hidden="true"
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--sloty-bg)] text-xs font-black"
              >
                {item.marker}
              </span>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div
        className={[
          shouldUseDesktopNav ? 'pr-72' : 'lg:pr-72',
          'transition-[padding]',
        ].join(' ')}
      >
        <UnifiedPageHeader
          clubName={selectedClubName}
          onMenuClick={() => setIsMenuOpen(true)}
          subtitle={pageHeaderMeta.subtitle}
          title={pageHeaderMeta.title}
        />

        <main
          className={[
            'min-h-svh px-4 pb-24 pt-5 sm:px-6 lg:pl-8 lg:pb-8 lg:pt-8',
            shouldUseDesktopNav ? 'pr-4 sm:pr-6' : 'lg:pr-8',
          ].join(' ')}
        >
          <div className="mx-auto w-full max-w-7xl">
            {flashMessage ? (
              <div
                aria-live="polite"
                className="mb-4 rounded-2xl border border-[var(--sloty-primary)]/20 bg-[var(--sloty-soft-mint)] px-4 py-3 text-sm font-bold text-[var(--sloty-primary-dark)] shadow-[var(--sloty-shadow)]"
                role="status"
              >
                <div className="flex items-center justify-between gap-3">
                  <span>{flashMessage}</span>
                  <button
                    className="rounded-lg px-2 py-1 text-xs hover:bg-white/70"
                    onClick={clearFlashMessage}
                    type="button"
                  >
                    إغلاق
                  </button>
                </div>
              </div>
            ) : null}
            <PageHeaderSuppressionProvider suppress>
              <Outlet />
            </PageHeaderSuppressionProvider>
          </div>
        </main>
      </div>

      {isMenuOpen ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-950/45"
          role="dialog"
        >
          <button
            aria-label="إغلاق القائمة"
            className="absolute inset-0 h-full w-full cursor-default"
            onClick={() => setIsMenuOpen(false)}
            type="button"
          />
          <aside className="absolute bottom-0 right-0 top-0 flex w-full max-w-sm flex-col overflow-y-auto bg-[var(--sloty-surface)] p-4 shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--sloty-border)] pb-4">
              <div>
                <h2 className="text-lg font-black text-[var(--sloty-text-primary)]">
                  القائمة
                </h2>
                <p className="mt-1 text-xs font-bold text-[var(--sloty-text-muted)]">
                  {displayName}
                </p>
              </div>
              <button
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--sloty-border)] text-sm font-black"
                onClick={() => setIsMenuOpen(false)}
                type="button"
              >
                إغلاق
              </button>
            </div>

            <div className="flex flex-1 flex-col gap-5 py-5">
              {mobileMenuGroups.map((group) => {
                const groupItems = group.paths
                  .map((path) => menuItems[path])
                  .filter(Boolean)

                if (groupItems.length === 0) {
                  return null
                }

                return (
                  <nav
                    aria-label={group.title}
                    className="space-y-2"
                    key={group.title}
                  >
                    <p className="px-1 text-xs font-black text-[var(--sloty-text-muted)]">
                      {group.title}
                    </p>
                    {groupItems.map((item) => (
                      <button
                        className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-right text-sm font-bold text-[var(--sloty-text-primary)] transition hover:bg-[var(--sloty-bg)]"
                        key={item.path}
                        onClick={() => handleMenuNavigation(item.path)}
                        type="button"
                      >
                        <span
                          aria-hidden="true"
                          className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--sloty-soft-mint)] text-xs font-black text-[var(--sloty-primary-dark)]"
                        >
                          {item.marker}
                        </span>
                        {item.label}
                      </button>
                    ))}
                  </nav>
                )
              })}

              <section className="mt-auto space-y-2 border-t border-[var(--sloty-border)] pt-5">
                <p className="px-1 text-xs font-black text-[var(--sloty-text-muted)]">
                  الحساب
                </p>
                {canChangeClub ? (
                  <button
                    className="min-h-11 w-full rounded-xl px-3 py-2 text-right text-sm font-bold text-[var(--sloty-text-primary)] transition hover:bg-[var(--sloty-bg)]"
                    onClick={handleChangeClub}
                    type="button"
                  >
                    تغيير النادي
                  </button>
                ) : null}
                <button
                  className="min-h-11 w-full rounded-xl px-3 py-2 text-right text-sm font-bold text-[var(--sloty-text-primary)] transition hover:bg-[var(--sloty-bg)]"
                  onClick={handleToggleViewMode}
                  type="button"
                >
                  {viewMode === 'desktop' ? 'عرض الهاتف' : 'عرض سطح المكتب'}
                </button>
                <button
                  className="min-h-11 w-full rounded-xl px-3 py-2 text-right text-sm font-bold text-[var(--sloty-danger)] transition hover:bg-[var(--sloty-danger-soft)]"
                  onClick={handleLogout}
                  type="button"
                >
                  تسجيل الخروج
                </button>
              </section>
            </div>
          </aside>
        </div>
      ) : null}

      {mobileItems.length > 0 && !shouldUseDesktopNav ? (
        <MobileBottomNav
          activeKey={location.pathname}
          items={mobileItems}
          onChange={handleMobileNavigation}
        />
      ) : null}
    </div>
  )
}
