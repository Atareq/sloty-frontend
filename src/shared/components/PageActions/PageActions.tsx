import type { ReactNode } from 'react'

export interface PageActionsProps {
  children: ReactNode
}

/**
 * Small layout-only row for actions that belong below AppShell's page header.
 */
export function PageActions({ children }: PageActionsProps) {
  return <div className="flex flex-wrap justify-end gap-2">{children}</div>
}
