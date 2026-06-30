import type { HTMLAttributes, ReactNode } from 'react'

export interface AppCardProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode
}

/**
 * Presentational card container for mobile-first Sloty surfaces.
 *
 * Use it to frame repeated items, forms, and focused panels. Keep feature data
 * loading and business rules outside this shared component.
 */
export function AppCard({
  children,
  className = '',
  ...sectionProps
}: AppCardProps) {
  return (
    <section
      className={[
        'rounded-2xl border border-[var(--sloty-border)] bg-[var(--sloty-surface)] p-4 shadow-[var(--sloty-shadow)]',
        className,
      ].join(' ')}
      {...sectionProps}
    >
      {children}
    </section>
  )
}
