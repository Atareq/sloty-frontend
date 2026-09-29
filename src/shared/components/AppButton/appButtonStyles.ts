export type AppButtonVariant = 'primary' | 'secondary' | 'danger'

const baseClasses =
  'inline-flex min-h-11 items-center justify-center rounded-xl border px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[var(--sloty-primary)] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60'

const variantClasses: Record<AppButtonVariant, string> = {
  primary:
    'sloty-green-surface-button border-transparent text-white shadow-sm hover:bg-[var(--sloty-primary-dark)]',
  secondary:
    'border-[var(--sloty-border)] bg-[var(--sloty-surface)] text-[var(--sloty-text-primary)] hover:border-[var(--sloty-primary)]',
  danger:
    'border-transparent bg-[var(--sloty-danger)] text-white shadow-sm hover:bg-[var(--sloty-no-show)]',
}

export interface AppButtonClassNameOptions {
  variant?: AppButtonVariant
  fullWidth?: boolean
  className?: string
}

/**
 * Canonical Sloty button classes.
 *
 * `AppButton` uses this for `<button>` actions; navigation links that must be
 * real `<a href>` elements (for example crawlable public-site links) reuse it
 * so they look identical without forking the button styles.
 */
export function getAppButtonClassName({
  variant = 'primary',
  fullWidth = false,
  className = '',
}: AppButtonClassNameOptions = {}): string {
  return [baseClasses, variantClasses[variant], fullWidth ? 'w-full' : '', className].join(
    ' ',
  )
}
