import type { ReactNode } from 'react'

export interface PageHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
}

/**
 * Reusable page header with Sloty's Arabic-first hierarchy.
 *
 * Keep it lightweight so feature pages can decide which actions and summary
 * content belong near the heading.
 */
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-[var(--sloty-text-primary)]">
          {title}
        </h1>
        {description ? (
          <p className="text-sm leading-6 text-[var(--sloty-text-muted)]">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
    </header>
  )
}
