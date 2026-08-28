import { useState, type ReactNode } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { searchCopy } from '../../copy/appCopy'

export interface QuickSearchShortcutsProps {
  children: ReactNode
  collapseWhen?: boolean
}

/**
 * Collapsible quick-filter shortcuts. Starts collapsed and auto-collapses
 * when the user starts typing a meaningful live-search query.
 */
export function QuickSearchShortcuts({
  children,
  collapseWhen = false,
}: QuickSearchShortcutsProps) {
  const [userExpanded, setUserExpanded] = useState(false)
  const isExpanded = userExpanded && !collapseWhen

  return (
    <section className="space-y-3">
      <button
        aria-expanded={isExpanded}
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-surface)] px-3 text-sm font-bold text-[var(--sloty-text-primary)]"
        onClick={() => setUserExpanded((current) => !current)}
        type="button"
      >
        <span>{searchCopy.quickShortcuts}</span>
        {isExpanded ? (
          <ChevronUp aria-hidden="true" className="h-4 w-4" />
        ) : (
          <ChevronDown aria-hidden="true" className="h-4 w-4" />
        )}
      </button>
      {isExpanded ? children : null}
    </section>
  )
}
