import type { ReactNode } from 'react'

export interface PageHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
  tone?: 'default' | 'brand'
}

/**
 * Reusable page header with Sloty's Arabic-first hierarchy.
 *
 * Keep it lightweight so feature pages can decide which actions and summary
 * content belong near the heading.
 */
export function PageHeader({
  title,
  description,
  actions,
  tone = 'default',
}: PageHeaderProps) {
  if (tone === 'brand') {
    return (
      <header className="relative overflow-hidden rounded-3xl border border-emerald-950/10 bg-[image:linear-gradient(135deg,rgba(6,78,59,0.96),rgba(11,107,58,0.86)),url('/images/sloty-green-surface-bg.png')] bg-cover bg-center p-5 text-white shadow-[var(--sloty-shadow)] sm:flex sm:items-start sm:justify-between sm:gap-6 sm:p-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-black">{title}</h1>
          {description ? (
            <p className="max-w-3xl text-sm leading-6 text-white/82">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="mt-4 flex shrink-0 gap-2 sm:mt-0">{actions}</div>
        ) : null}
      </header>
    )
  }

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
