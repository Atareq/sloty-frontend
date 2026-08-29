import type { ReactNode } from 'react'
import { AppSheet } from '../AppSheet/AppSheet'

export interface FilterSheetProps {
  isOpen: boolean
  title: string
  children: ReactNode
  onClose: () => void
}

/**
 * Reusable mobile-first filter drawer.
 *
 * Feature pages own filter state and URL updates; this component only provides
 * a consistent dialog surface for advanced filter controls.
 */
export function FilterSheet({
  children,
  isOpen,
  onClose,
  title,
}: FilterSheetProps) {
  return (
    <AppSheet
      ariaLabel={title}
      className="min-w-0 max-w-full md:max-w-2xl"
      isOpen={isOpen}
      onRequestClose={onClose}
    >
      <div className="w-full min-w-0 max-w-full overflow-x-hidden p-5 pt-14">
        <h2 className="mb-5 text-xl font-extrabold text-[var(--sloty-text-primary)]">
          {title}
        </h2>
        {children}
      </div>
    </AppSheet>
  )
}
