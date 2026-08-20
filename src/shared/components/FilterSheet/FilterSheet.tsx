import type { ReactNode } from 'react'
import { AppButton } from '../AppButton/AppButton'

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
  if (!isOpen) {
    return null
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end bg-slate-950/45 p-0 md:items-center md:justify-center md:p-6"
      role="dialog"
    >
      <div className="max-h-[88vh] w-full min-w-0 max-w-full overflow-x-hidden overflow-y-auto rounded-t-3xl bg-[var(--sloty-surface)] p-5 shadow-2xl md:max-w-2xl md:rounded-3xl">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-xl font-black text-[var(--sloty-text-primary)]">
            {title}
          </h2>
          <AppButton onClick={onClose} type="button" variant="secondary">
            إغلاق
          </AppButton>
        </div>
        {children}
      </div>
    </div>
  )
}
