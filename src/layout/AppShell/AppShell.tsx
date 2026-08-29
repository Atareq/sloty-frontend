import { useCallback, useEffect, useMemo, useState } from 'react'
import { LogOut, X } from 'lucide-react'
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
import { AppSuccessNotice } from '../../shared/components/AppSuccessNotice/AppSuccessNotice'
import { roleCopy } from '../../shared/copy/appCopy'
import { appRoutes } from '../../shared/navigation/appRoutes'
import { getAuthenticatedUserDisplayName } from '../../shared/utils/displayNames'
import {
  getNavigationItemsForRole,
  getPageHeaderMeta,
  type NavigationItem,
} from '../../shared/navigation/navigation.config'
import { RouteScrollReset } from '../RouteScrollReset'
import { AppViewModeContext, type ViewMode } from './AppShell.viewMode'

const desktopViewMediaQuery = '(min-width: 1024px)'

function isNavigationItemActive(pathname: string, itemPath: string): boolean {
  if (pathname === itemPath) {
    return true
  }

  if (itemPath === '/schedule') {
    return false
  }

  return pathname.startsWith(`${itemPath}/`)
}

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

function getResponsiveViewMode(): ViewMode {
  if (
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function'
  ) {
    return 'mobile'
  }

  return window.matchMedia(desktopViewMediaQuery).matches
    ? 'desktop'
    : 'mobile'
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
  const [viewMode, setViewMode] = useState<ViewMode>(getResponsiveViewMode)
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
  const selectedCourtName = selectedMembership?.court?.name ?? null
  const roleLabel = selectedMembership
    ? roleCopy[selectedMembership.role]
    : role
      ? roleCopy[role]
      : null
  const identityContext =
    selectedMembership?.role === 'STAFF' && selectedCourtName
      ? selectedCourtName
      : selectedClubName
  const canChangeClub = (currentUser?.memberships.length ?? 0) > 1
  const flashMessage = getFlashMessage(location.state)
  const isDrawerAllowed = shouldShowMobileMenu
  const isBookingRoute = ['/dashboard', '/bookings'].includes(
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
  const isHomeRoute = location.pathname === appRoutes.home
  const shouldShowHomeButton =
    !isHomeRoute &&
    (role === 'OWNER' ||
      role === 'MANAGER' ||
      role === 'STAFF' ||
      role === 'PLATFORM_ADMIN')
  const requestCloseMenu = useAppOverlayRegistration(isMenuOpen, () => {
    setIsMenuOpen(false)
  })

  const clearFlashMessage = useCallback((): void => {
    navigate(`${location.pathname}${location.search}${location.hash}`, {
      replace: true,
      state: null,
    })
  }, [location.hash, location.pathname, location.search, navigate])

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

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      return
    }

    const mediaQuery = window.matchMedia(desktopViewMediaQuery)
    const handleChange = (): void => {
      setViewMode(mediaQuery.matches ? 'desktop' : 'mobile')
      setIsMenuOpen(false)
    }

    handleChange()
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

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
        hidden={!shouldUseDesktopNav}
      >
        <div className="sloty-green-surface rounded-3xl p-4 text-white">
          <p className="text-base font-bold leading-6">{displayName}</p>
          {identityContext ? (
            <p className="mt-1 text-xs font-medium leading-5 text-white/78">
              {identityContext}
            </p>
          ) : null}
          {roleLabel ? (
            <p className="mt-1 text-xs font-medium leading-5 text-white/78">
              {roleLabel}
            </p>
          ) : null}
        </div>

        <nav
          aria-label="تنقل التطبيق"
          className="mt-5 flex flex-1 flex-col gap-1"
        >
          {desktopItems.map((item) => {
            const Icon = item.icon

            return (
              <NavLink
                className={({ isActive }) =>
                  [
                    'flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[15px] font-semibold transition',
                    isActive || isNavigationItemActive(location.pathname, item.path)
                      ? 'bg-[var(--sloty-soft-mint)] text-[var(--sloty-primary-dark)]'
                      : 'text-[var(--sloty-text-muted)] hover:bg-[var(--sloty-bg)] hover:text-[var(--sloty-text-primary)]',
                  ].join(' ')
                }
                key={item.path}
                to={item.path}
              >
                <Icon aria-hidden="true" className="h-5 w-5 shrink-0" />
                {item.label}
              </NavLink>
            )
          })}
        </nav>

        {shouldUseDesktopNav ? (
          <section className="border-t border-[var(--sloty-border)] pt-4">
            <button
              className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-2 text-right text-sm font-bold text-[var(--sloty-danger)] transition hover:bg-[var(--sloty-danger-soft)]"
              onClick={handleLogout}
              type="button"
            >
              <LogOut aria-hidden="true" className="h-5 w-5" />
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
        <RouteScrollReset />
        <PageHeader
          clubName={selectedClubName}
          onHomeClick={() => {
            navigate(appRoutes.home)
          }}
          onMenuClick={handleOpenMenu}
          resetKey={location.pathname}
          showHomeButton={shouldShowHomeButton}
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
              <AppSuccessNotice
                message={flashMessage}
                onDismiss={clearFlashMessage}
              />
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
          <aside className="absolute bottom-0 right-0 top-0 flex w-[min(82vw,320px)] flex-col overflow-y-auto rounded-l-[26px] bg-[var(--sloty-surface)] p-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-[var(--sloty-border)] pb-4">
              <div className="min-w-0">
                <p className="text-base font-bold leading-6 text-[var(--sloty-text-primary)]">
                  {displayName}
                </p>
                {identityContext ? (
                  <p className="mt-1 text-xs font-medium leading-5 text-[var(--sloty-text-muted)]">
                    {identityContext}
                  </p>
                ) : null}
                {roleLabel ? (
                  <p className="mt-0.5 text-xs font-medium leading-5 text-[var(--sloty-text-muted)]">
                    {roleLabel}
                  </p>
                ) : null}
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

            <nav
              aria-label="تنقل التطبيق"
              className="flex flex-1 flex-col gap-1 py-5"
            >
              {desktopItems.map((item) => {
                const Icon = item.icon
                const isActive = isNavigationItemActive(
                  location.pathname,
                  item.path,
                )

                return (
                  <NavLink
                    aria-current={isActive ? 'page' : undefined}
                    className={[
                      'flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-right text-[15px] font-semibold transition',
                      isActive
                        ? 'bg-[var(--sloty-soft-mint)] text-[var(--sloty-primary-dark)]'
                        : 'text-[var(--sloty-text-primary)] hover:bg-[var(--sloty-bg)]',
                    ].join(' ')}
                    key={item.path}
                    onClick={() => setIsMenuOpen(false)}
                    to={item.path}
                  >
                    <Icon aria-hidden="true" className="h-5 w-5 shrink-0" />
                    {item.label}
                  </NavLink>
                )
              })}
            </nav>

            <section className="mt-auto space-y-2 border-t border-[var(--sloty-border)] pt-5">
                {canChangeClub ? (
                  <button
                    className="min-h-11 w-full rounded-xl px-3 py-2 text-right text-[15px] font-semibold text-[var(--sloty-text-primary)] transition hover:bg-[var(--sloty-bg)]"
                    onClick={handleChangeClub}
                    type="button"
                  >
                    تغيير النادي
                  </button>
                ) : null}
                <button
                  className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-2 text-right text-[15px] font-semibold text-[var(--sloty-danger)] transition hover:bg-[var(--sloty-danger-soft)]"
                  onClick={handleLogout}
                  type="button"
                >
                  <LogOut aria-hidden="true" className="h-5 w-5" />
                  تسجيل الخروج
                </button>
            </section>
          </aside>
        </div>
      ) : null}

      {shouldShowBookingFab ? (
        <NewBookingFAB
          onClick={() => {
            navigate(appRoutes.home, {
              state: { beginAtDayChoice: true },
            })
          }}
        />
      ) : null}
    </div>
  )
}
