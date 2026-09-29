import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { getAppButtonClassName, type AppButtonVariant } from './appButtonStyles'

export type { AppButtonVariant } from './appButtonStyles'

export interface AppButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: AppButtonVariant
  fullWidth?: boolean
}

/**
 * Presentational Sloty button.
 *
 * Business decisions stay in feature screens; this component only standardizes
 * the visual treatment of common actions.
 */
export function AppButton({
  children,
  className = '',
  fullWidth = false,
  type = 'button',
  variant = 'primary',
  ...buttonProps
}: AppButtonProps) {
  return (
    <button
      className={getAppButtonClassName({ variant, fullWidth, className })}
      type={type}
      {...buttonProps}
    >
      {children}
    </button>
  )
}
