import { Home } from 'lucide-react'
import { appNavCopy } from '../../copy/appCopy'

export interface PageHeaderProps {
  title: string
  subtitle?: string
  clubName?: string | null
  showMenuButton?: boolean
  showHomeButton?: boolean
  onMenuClick?: () => void
  onHomeClick?: () => void
}

/**
 * Canonical Sloty page header.
 *
 * AppShell provides route metadata and selected-club context so this shared
 * component stays presentational and does not depend on auth or routing hooks.
 * Home and Back remain distinct: Home always targets the operational Home route.
 *
 * Mobile RTL hierarchy uses three columns: burger on the start edge (visual
 * top-right), identity in the middle, and Home on the opposite edge (visual
 * top-left). Do not place Burger and Home in the same action group.
 */
export function PageHeader({
  title,
  subtitle,
  clubName,
  showMenuButton = true,
  showHomeButton = false,
  onMenuClick,
  onHomeClick,
}: PageHeaderProps) {
  return (
    <header
      className="sticky top-0 z-30 overflow-x-hidden border-b border-[var(--sloty-border)] bg-[var(--sloty-surface)]/95 px-4 py-3 text-[var(--sloty-text-primary)] shadow-sm backdrop-blur-md sm:px-6"
      dir="rtl"
    >
      <div className="mx-auto grid w-full max-w-7xl grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 sm:gap-4">
        <div
          className="flex min-h-11 min-w-11 shrink-0 items-start justify-center"
          data-page-header-actions="start"
        >
          {showMenuButton ? (
            <button
              aria-label="فتح القائمة"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--sloty-bg)] text-[var(--sloty-text-primary)] transition hover:bg-[var(--sloty-soft-mint)] focus:outline-none focus:ring-2 focus:ring-[var(--sloty-primary)]/30"
              onClick={onMenuClick}
              type="button"
            >
              <span className="flex w-6 flex-col gap-1.5" aria-hidden="true">
                <span className="h-0.5 rounded-full bg-current" />
                <span className="h-0.5 rounded-full bg-current" />
                <span className="h-0.5 rounded-full bg-current" />
              </span>
            </button>
          ) : null}
        </div>

        <div className="min-w-0 overflow-hidden space-y-1">
          <p className="truncate text-sm font-extrabold text-[var(--sloty-primary-dark)]">
            Sloty
          </p>
          {clubName ? (
            <p className="break-words text-xs font-bold leading-5 text-[var(--sloty-text-muted)]">
              النادي الحالي: {clubName}
            </p>
          ) : null}
          <div className="space-y-1">
            <h1 className="break-words text-xl font-extrabold leading-8 sm:text-2xl">
              {title}
            </h1>
            {subtitle ? (
              <p className="break-words text-sm font-bold leading-6 text-[var(--sloty-text-muted)]">
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>

        <div
          className="flex min-h-11 min-w-11 shrink-0 items-start justify-center"
          data-page-header-actions="end"
        >
          {showHomeButton ? (
            <button
              aria-label={appNavCopy.home}
              className="inline-flex h-11 max-w-[42vw] shrink-0 items-center gap-1.5 rounded-2xl bg-[var(--sloty-bg)] px-2.5 text-[var(--sloty-text-primary)] transition hover:bg-[var(--sloty-soft-mint)] focus:outline-none focus:ring-2 focus:ring-[var(--sloty-primary)]/30 sm:max-w-none"
              onClick={onHomeClick}
              type="button"
            >
              <Home aria-hidden="true" className="h-5 w-5 shrink-0" strokeWidth={2.25} />
              <span className="truncate text-sm font-bold">{appNavCopy.home}</span>
            </button>
          ) : null}
        </div>
      </div>
    </header>
  )
}
