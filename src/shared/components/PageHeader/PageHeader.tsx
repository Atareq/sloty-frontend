import { useRef } from 'react'
import { Home } from 'lucide-react'
import { appNavCopy } from '../../copy/appCopy'
import { usePageHeaderScroll } from '../../hooks/usePageHeaderScroll'

export interface PageHeaderProps {
  title: string
  subtitle?: string
  clubName?: string | null
  showMenuButton?: boolean
  showHomeButton?: boolean
  onMenuClick?: () => void
  onHomeClick?: () => void
  /**
   * Route pathname (or similar). When it changes, collapse progress re-syncs
   * from the current window scroll so a new page at the top starts expanded.
   */
  resetKey?: string
}

const headerGridClassName =
  'mx-auto grid w-full max-w-7xl grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 sm:gap-4'

/**
 * Canonical Sloty page header.
 *
 * AppShell provides route metadata and selected-club context so this shared
 * component stays presentational and does not depend on auth or routing hooks.
 * Home and Back remain distinct: Home always targets the operational Home route.
 *
 * The green visual is the original `.sloty-green-surface` treatment
 * (`public/images/sloty-green-surface-bg.png`). It belongs to the transient
 * page-context region: visible at the top of the page, then fading/blurring
 * with that context. Do not replace it with a generated image or a second hero.
 *
 * Persistent navigation is a compact sticky layer: Burger on the RTL start
 * edge (visual top-right) and Home on the opposite edge. Those controls do not
 * fade. After collapse the large header height is gone because the context is
 * in document flow, not sticky.
 */
export function PageHeader({
  title,
  subtitle,
  clubName,
  showMenuButton = true,
  showHomeButton = false,
  onMenuClick,
  onHomeClick,
  resetKey,
}: PageHeaderProps) {
  const headerRef = useRef<HTMLElement>(null)
  const scrollState = usePageHeaderScroll(headerRef, resetKey)
  const isCollapsed = scrollState === 'collapsed'
  const hasPersistentControls = showMenuButton || showHomeButton
  const controlButtonClassName = isCollapsed
    ? 'bg-[var(--sloty-bg)] text-[var(--sloty-text-primary)] hover:bg-[var(--sloty-soft-mint)] focus:ring-[var(--sloty-primary)]/30'
    : 'bg-white/12 text-white hover:bg-white/18 focus:ring-white/70'

  return (
    <header
      className="relative z-30 overflow-x-hidden"
      data-header-scroll-state={scrollState}
      dir="rtl"
      ref={headerRef}
    >
      {hasPersistentControls ? (
        <div className="sloty-page-header-controls sticky top-0 z-40">
          <div className={`${headerGridClassName} px-4 pt-4 sm:px-6 sm:pt-5`}>
            <div
              className="flex min-h-11 min-w-11 shrink-0 items-start justify-center"
              data-page-header-actions="start"
            >
              {showMenuButton ? (
                <button
                  aria-label="فتح القائمة"
                  className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition focus:outline-none focus:ring-2 ${controlButtonClassName}`}
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

            <div className="min-w-0" aria-hidden="true" />

            <div
              className="flex min-h-11 min-w-11 shrink-0 items-start justify-center"
              data-page-header-actions="end"
            >
              {showHomeButton ? (
                <button
                  aria-label={appNavCopy.home}
                  className={`inline-flex h-11 max-w-[42vw] shrink-0 items-center gap-1.5 rounded-2xl px-2.5 transition focus:outline-none focus:ring-2 sm:max-w-none ${controlButtonClassName}`}
                  onClick={onHomeClick}
                  type="button"
                >
                  <Home
                    aria-hidden="true"
                    className="h-5 w-5 shrink-0"
                    strokeWidth={2.25}
                  />
                  <span className="truncate text-sm font-bold">
                    {appNavCopy.home}
                  </span>
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <div
        aria-hidden={isCollapsed}
        className={[
          'sloty-green-surface sloty-page-header-context rounded-b-3xl px-4 pb-5 pt-4 text-white shadow-[var(--sloty-shadow)] sm:px-6 sm:pt-5',
          hasPersistentControls ? 'sloty-page-header-context-under-controls' : '',
        ].join(' ')}
        data-page-header-context=""
        inert={isCollapsed ? true : undefined}
      >
        <div className={headerGridClassName}>
          <div
            aria-hidden="true"
            className="min-h-11 min-w-11 shrink-0"
          />
          <div className="min-w-0 overflow-hidden space-y-2">
            <p className="truncate text-base font-black">Sloty</p>
            {clubName ? (
              <p className="break-words text-xs font-bold leading-5 text-white/75">
                النادي الحالي: {clubName}
              </p>
            ) : null}
            <div className="space-y-1 pt-1">
              <h1 className="break-words text-2xl font-black leading-9">
                {title}
              </h1>
              {subtitle ? (
                <p className="break-words text-sm font-bold leading-6 text-white/75">
                  {subtitle}
                </p>
              ) : null}
            </div>
          </div>
          <div
            aria-hidden="true"
            className="min-h-11 min-w-11 shrink-0"
          />
        </div>
      </div>
    </header>
  )
}
