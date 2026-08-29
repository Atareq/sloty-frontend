import type { ReactNode } from 'react'
import { LoaderCircle } from 'lucide-react'
import { searchCopy } from '../../copy/appCopy'

export interface ResultRefreshRegionProps {
  children: ReactNode
  isRefreshing: boolean
  label?: string
}

/**
 * Subtle results-only refresh state. The search input and page chrome stay
 * interactive; previous results remain visible until replacement.
 */
export function ResultRefreshRegion({
  children,
  isRefreshing,
  label = searchCopy.resultsRefreshing,
}: ResultRefreshRegionProps) {
  return (
    <div className="relative">
      {isRefreshing ? (
        <p
          aria-live="polite"
          className="mb-2 flex items-center gap-2 text-sm font-bold text-[var(--sloty-text-muted)]"
        >
          {label}
          <LoaderCircle
            aria-hidden="true"
            className="h-4 w-4 animate-spin text-[var(--sloty-primary)]"
          />
        </p>
      ) : null}
      <div
        aria-busy={isRefreshing}
        className={isRefreshing ? 'pointer-events-none opacity-60' : undefined}
      >
        {children}
      </div>
    </div>
  )
}
