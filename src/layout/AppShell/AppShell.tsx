import { NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { useAuth } from '../../core/auth/useAuth'
import { AppButton } from '../../shared/components/AppButton/AppButton'
import { MobileBottomNav } from '../../shared/components/MobileBottomNav/MobileBottomNav'
import { getNavigationItemsForRole } from '../../shared/navigation/navigation.config'

/**
 * Role-aware application shell for authenticated Sloty pages.
 *
 * Desktop gets a sidebar-style operations layout. Mobile gets the same role
 * navigation as a bottom bar, keeping navigation rules in one shared config.
 */
export function AppShell() {
  const { claims, logout, role } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const desktopItems = role ? getNavigationItemsForRole(role) : []
  const mobileItems = role
    ? getNavigationItemsForRole(role, { mobileOnly: true }).map((item) => ({
        key: item.path,
        label: item.label,
        marker: item.marker,
        path: item.path,
      }))
    : []

  function handleLogout(): void {
    logout()
    navigate('/login')
  }

  function handleMobileNavigation(nextPath: string): void {
    navigate(nextPath)
  }

  return (
    <div
      aria-label="هيكل تطبيق سلوتي"
      className="min-h-svh bg-[var(--sloty-bg)] text-[var(--sloty-text-primary)]"
    >
      <aside className="fixed bottom-0 right-0 top-0 hidden w-72 flex-col border-l border-[var(--sloty-border)] bg-[var(--sloty-surface)] px-4 py-5 shadow-[var(--sloty-shadow)] lg:flex">
        <div className="rounded-3xl bg-[image:linear-gradient(135deg,rgba(6,78,59,0.95),rgba(11,107,58,0.84)),url('/images/sloty-green-surface-bg.png')] bg-cover bg-center p-4 text-white">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/16 text-xl font-black">
            س
          </div>
          <p className="mt-3 text-lg font-black">Sloty</p>
          <p className="mt-1 text-xs leading-5 text-white/78">
            {claims?.name ?? 'مستخدم سلوتي'}
          </p>
        </div>

        <nav aria-label="تنقل التطبيق" className="mt-5 flex flex-1 flex-col gap-1">
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
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--sloty-bg)] text-xs font-black">
                {item.marker}
              </span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <AppButton onClick={handleLogout} variant="secondary">
          تسجيل الخروج
        </AppButton>
      </aside>

      <header className="sticky top-0 z-30 border-b border-[var(--sloty-border)] bg-[var(--sloty-surface)]/96 px-4 py-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div>
            <p className="text-base font-black text-[var(--sloty-primary-dark)]">
              Sloty
            </p>
            <p className="text-xs text-[var(--sloty-text-muted)]">
              {claims?.name ?? 'مستخدم سلوتي'}
            </p>
          </div>
          <AppButton onClick={handleLogout} variant="secondary">
            خروج
          </AppButton>
        </div>
      </header>

      <main className="min-h-svh px-4 pb-24 pt-5 sm:px-6 lg:pr-80 lg:pl-8 lg:pb-8 lg:pt-8">
        <div className="mx-auto w-full max-w-7xl">
          <Outlet />
        </div>
      </main>

      {mobileItems.length > 0 ? (
        <MobileBottomNav
          activeKey={location.pathname}
          items={mobileItems}
          onChange={handleMobileNavigation}
        />
      ) : null}
    </div>
  )
}
