import type { ButtonHTMLAttributes, ReactNode } from 'react'

export type AppButtonVariant = 'primary' | 'secondary' | 'danger'

export interface AppButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: AppButtonVariant
  fullWidth?: boolean
}

const variantClasses: Record<AppButtonVariant, string> = {
  primary:
    'border-transparent bg-[var(--sloty-primary)] text-white shadow-sm hover:bg-[var(--sloty-primary-dark)]',
  secondary:
    'border-[var(--sloty-border)] bg-[var(--sloty-surface)] text-[var(--sloty-text-primary)] hover:border-[var(--sloty-primary)]',
  danger:
    'border-transparent bg-[var(--sloty-danger)] text-white shadow-sm hover:bg-[var(--sloty-no-show)]',
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
  const widthClass = fullWidth ? 'w-full' : ''

  return (
    <button
      className={[
        'inline-flex min-h-11 items-center justify-center rounded-xl border px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[var(--sloty-primary)] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
        variantClasses[variant],
        widthClass,
        className,
      ].join(' ')}
      type={type}
      {...buttonProps}
    >
      {children}
    </button>
  )
}
