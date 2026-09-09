import { useContext, useLayoutEffect, type ReactNode } from 'react'
import { PageHeaderActionContext } from './pageHeaderActionContext'

export interface PageHeaderActionProps {
  children: ReactNode
}

/**
 * Presentation primitive allowing a child route or feature page to contribute
 * an action into the active PageHeader's end/top-left slot.
 *
 * Preserves strict boundary: PageHeader owns header presentation, the child
 * feature owns its local business state, and the shell/context knows nothing
 * about domain logic (courts, bookings, sharing, roles).
 */
export function PageHeaderAction({ children }: PageHeaderActionProps) {
  const setHeaderAction = useContext(PageHeaderActionContext)

  useLayoutEffect(() => {
    if (!setHeaderAction) {
      return
    }

    setHeaderAction(children)

    return () => {
      setHeaderAction(null)
    }
  }, [children, setHeaderAction])

  return null
}
