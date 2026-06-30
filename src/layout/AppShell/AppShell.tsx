import { Outlet } from 'react-router'

/**
 * Minimal application shell for the React restart foundation.
 *
 * The shell owns global page spacing only. Navigation will be added later when
 * real role-specific screens exist.
 */
export function AppShell() {
  return (
    <div
      aria-label="هيكل تطبيق سلوتي"
      className="min-h-svh bg-[var(--sloty-bg)] text-[var(--sloty-text-primary)]"
    >
      <main className="mx-auto flex min-h-svh w-full max-w-5xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  )
}
