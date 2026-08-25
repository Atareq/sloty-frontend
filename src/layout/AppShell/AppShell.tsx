import { useCallback, useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import {
  canViewOwnSettlements,
  type AuthRole,
  type CurrentUserMembership,
} from '../../core/auth/auth.types'
import { useAuth } from '../../core/auth/useAuth'
import {
  useAppOverlayRegistration,
  useHasActiveAppSheet,
} from '../../shared/components/AppSheet/appSheetOverlay'
import { NewBookingFAB } from '../../shared/components/NewBookingFAB/NewBookingFAB'
import { PageHeader } from '../../shared/components/PageHeader/PageHeader'
import { getAuthenticatedUserDisplayName } from '../../shared/utils/displayNames'
import {
  getNavigationItemsForRole,
  getPageHeaderMeta,
  type NavigationItem,
} from '../../shared/navigation/navigation.config'
import { AppViewModeContext, type ViewMode } from './AppShell.viewMode'

const viewModeStorageKey = 'sloty:view-mode'

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
    paths: ['/reports', '/settings'],
  },
  {
    title: 'إدارة المنصة',
    paths: ['/admin/clubs', '/admin/users'],
  },
]

function canShowNavigationItem(
  item: NavigationItem,
  selectedMembership: CurrentUserMembership | null,
  role: AuthRole | null,
): boolean {
  if (item.path === '/settlements') {
    return canViewOwnSettlements(selectedMembership, role)
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

  const storedViewMode = window.localStorage.getItem(viewModeStorageKey)

  if (storedViewMode === 'desktop') {
    return 'desktop'
  }

  if (storedViewMode !== null && storedViewMode !== 'mobile') {
    window.localStorage.setItem(viewModeStorageKey, 'mobile')
  }

  return 'mobile'
}

function getViewModeToggleLabel(currentViewMode: ViewMode): string {
  return currentViewMode === 'desktop' ? 'عرض الهاتف' : 'عرض سطح المكتب'
}

/**
 * Role-aware application shell for authenticated Sloty pages.
 *
 * AppShell owns the authenticated chrome: one unified header, the mobile
 * drawer/account menu, desktop navigation, and global mobile booking action.
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
  const hasActiveAppSheet = useHasActiveAppSheet()
  const pageHeaderMeta = getPageHeaderMeta(
    location.pathname,
    role,
    selectedMembership,
  )
  const shouldUseDesktopNav = viewMode === 'desktop'
  const shouldShowMobileMenu = !shouldUseDesktopNav
  const desktopItems = useMemo(
    () =>
      role
        ? getNavigationItemsForRole(
            role,
            { primaryOnly: true },
            selectedMembership,
          ).filter((item) =>
            canShowNavigationItem(item, selectedMembership, role),
          )
        : [],
    [role, selectedMembership],
  )
  const displayName = getAuthenticatedUserDisplayName(
    currentUser,
    claims?.name,
  )
  const selectedClubName = selectedMembership?.club.name ?? null
  const canChangeClub = (currentUser?.memberships.length ?? 0) > 1
  const flashMessage = getFlashMessage(location.state)
  const isDrawerAllowed = shouldShowMobileMenu
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
  const isBookingRoute = ['/dashboard', '/schedule', '/bookings'].includes(
    location.pathname,
  )
  const canCreateBooking =
    role === 'OWNER' || role === 'MANAGER' || role === 'STAFF'
  const shouldShowBookingFab =
    isBookingRoute &&
    canCreateBooking &&
    !shouldUseDesktopNav &&
    !isMenuOpen &&
    !hasActiveAppSheet
  const requestCloseMenu = useAppOverlayRegistration(isMenuOpen, () => {
    setIsMenuOpen(false)
  })

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
    }, 3000)

    return () => window.clearTimeout(timeoutId)
  }, [clearFlashMessage, flashMessage])

  function handleOpenMenu(): void {
    if (!isDrawerAllowed) {
      return
    }

    setIsMenuOpen(true)
  }

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

  function handleMenuNavigation(nextPath: string): void {
    setIsMenuOpen(false)
    navigate(nextPath)
  }

  function handleSetViewMode(nextViewMode: ViewMode): void {
    window.localStorage.setItem(viewModeStorageKey, nextViewMode)
    setIsMenuOpen(false)
    setViewMode(nextViewMode)
  }

  function handleToggleViewMode(): void {
    setViewMode((currentViewMode) => {
      const nextViewMode = currentViewMode === 'desktop' ? 'mobile' : 'desktop'

      window.localStorage.setItem(viewModeStorageKey, nextViewMode)
      setIsMenuOpen(false)

      return nextViewMode
    })
  }

  useEffect(() => {
    if (!isMenuOpen) {
      return
    }

    function handleEscape(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        event.preventDefault()
        requestCloseMenu()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isMenuOpen, requestCloseMenu])

  return (
    <div
      aria-label="هيكل تطبيق سلوتي"
      className="min-h-svh bg-[var(--sloty-bg)] text-[var(--sloty-text-primary)]"
      data-view-mode={viewMode}
    >
      <aside
        className={[
          'fixed bottom-0 right-0 top-0 z-40 w-72 flex-col border-l border-[var(--sloty-border)] bg-[var(--sloty-surface)] px-4 py-5 shadow-[var(--sloty-shadow)]',
          shouldUseDesktopNav ? 'flex' : 'hidden',
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

        {shouldUseDesktopNav ? (
          <section className="border-t border-[var(--sloty-border)] pt-4">
            <p className="px-1 text-xs font-black text-[var(--sloty-text-muted)]">
              العرض
            </p>
            <button
              className="mt-2 min-h-11 w-full rounded-xl px-3 py-2 text-right text-sm font-bold text-[var(--sloty-primary-dark)] transition hover:bg-[var(--sloty-bg)]"
              onClick={() => handleSetViewMode('mobile')}
              type="button"
            >
              عرض الهاتف
            </button>
            <button
              className="mt-2 min-h-11 w-full rounded-xl px-3 py-2 text-right text-sm font-bold text-[var(--sloty-danger)] transition hover:bg-[var(--sloty-danger-soft)]"
              onClick={handleLogout}
              type="button"
            >
              تسجيل الخروج
            </button>
          </section>
        ) : null}
      </aside>

      <div
        className={[
          shouldUseDesktopNav ? 'pr-72' : '',
          'transition-[padding]',
        ].join(' ')}
      >
        <PageHeader
          clubName={selectedClubName}
          onMenuClick={handleOpenMenu}
          showMenuButton={isDrawerAllowed}
          subtitle={pageHeaderMeta.subtitle}
          title={pageHeaderMeta.title}
        />

        <main
          className={[
            'min-h-svh px-4 pt-5 sm:px-6 lg:pl-8 lg:pb-8 lg:pt-8',
            isBookingRoute && canCreateBooking ? 'pb-24' : 'pb-8',
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
            <AppViewModeContext.Provider value={viewMode}>
              <Outlet />
            </AppViewModeContext.Provider>
          </div>
        </main>
      </div>

      {isMenuOpen && isDrawerAllowed ? (
        <div
          aria-label="قائمة التنقل"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-950/45"
          role="dialog"
        >
          <button
            aria-label="إغلاق القائمة"
            className="absolute inset-0 h-full w-full cursor-default"
            onClick={requestCloseMenu}
            type="button"
          />
          <aside className="absolute bottom-0 right-0 top-0 flex w-[min(82vw,320px)] flex-col overflow-y-auto bg-[var(--sloty-surface)] p-4 shadow-2xl">
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
                aria-label="إغلاق القائمة"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--sloty-text-muted)] transition hover:bg-[var(--sloty-bg)] hover:text-[var(--sloty-text-primary)]"
                onClick={requestCloseMenu}
                type="button"
              >
                <X aria-hidden="true" size={20} />
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
                  {getViewModeToggleLabel(viewMode)}
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

      {shouldShowBookingFab ? (
        <NewBookingFAB
          onClick={() => {
            if (location.pathname !== '/schedule') {
              navigate('/schedule')
            }
          }}
        />
      ) : null}
    </div>
  )
}
