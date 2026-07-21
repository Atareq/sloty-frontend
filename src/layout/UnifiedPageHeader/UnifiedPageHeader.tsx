export interface UnifiedPageHeaderProps {
  title: string
  subtitle?: string
  clubName?: string | null
  showMenuButton?: boolean
  onMenuClick?: () => void
}

/**
 * Authenticated-page header used once by AppShell.
 *
 * Page titles come from route metadata so feature pages can focus on their
 * forms, lists, and actions without recreating the same header pattern.
 */
export function UnifiedPageHeader({
  title,
  subtitle,
  clubName,
  showMenuButton = true,
  onMenuClick,
}: UnifiedPageHeaderProps) {
  return (
    <header className="sloty-green-surface rounded-b-3xl px-4 pb-5 pt-4 text-white shadow-[var(--sloty-shadow)] sm:px-6 sm:pt-5">
      <div className="mx-auto flex w-full max-w-7xl items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <p className="text-base font-black">Sloty</p>
          {clubName ? (
            <p className="text-xs font-bold leading-5 text-white/75">
              النادي الحالي: {clubName}
            </p>
          ) : null}
          <div className="space-y-1 pt-1">
            <h1 className="text-2xl font-black leading-9">{title}</h1>
            {subtitle ? (
              <p className="text-sm font-bold leading-6 text-white/75">
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>

        {showMenuButton ? (
          <button
            aria-label="فتح القائمة"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/12 text-white transition hover:bg-white/18 focus:outline-none focus:ring-2 focus:ring-white/70"
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
    </header>
  )
}
