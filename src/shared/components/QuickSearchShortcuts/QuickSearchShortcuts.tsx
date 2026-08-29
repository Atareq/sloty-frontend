import { useState, type ReactNode } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { searchCopy } from '../../copy/appCopy'

export interface QuickSearchShortcutsProps {
  children: ReactNode
  /**
   * Live search draft from the sibling search field.
   * When this value changes to a meaningful query, expanded shortcuts
   * auto-collapse. The trigger stays enabled so the user can reopen them.
   */
  searchQuery?: string
}

/**
 * Collapsible quick-filter shortcuts.
 *
 * `isQuickSearchExpanded` and `searchQuery` are separate. Typing may collapse
 * an open panel; it must never disable the accordion trigger.
 */
export function QuickSearchShortcuts({
  children,
  searchQuery = '',
}: QuickSearchShortcutsProps) {
  const [isQuickSearchExpanded, setIsQuickSearchExpanded] = useState(false)
  const [lastSeenSearchQuery, setLastSeenSearchQuery] = useState(searchQuery)

  if (searchQuery !== lastSeenSearchQuery) {
    setLastSeenSearchQuery(searchQuery)
    if (isQuickSearchExpanded && searchQuery.trim()) {
      setIsQuickSearchExpanded(false)
    }
  }

  return (
    <section className="space-y-3">
      <button
        aria-expanded={isQuickSearchExpanded}
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-surface)] px-3 text-sm font-bold text-[var(--sloty-text-primary)]"
        onClick={() => setIsQuickSearchExpanded((current) => !current)}
        type="button"
      >
        <span>{searchCopy.quickShortcuts}</span>
        {isQuickSearchExpanded ? (
          <ChevronUp aria-hidden="true" className="h-4 w-4" />
        ) : (
          <ChevronDown aria-hidden="true" className="h-4 w-4" />
        )}
      </button>
      {isQuickSearchExpanded ? children : null}
    </section>
  )
}
