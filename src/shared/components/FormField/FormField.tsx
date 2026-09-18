import type { ReactNode } from 'react'

interface FormFieldProps {
  /** Field label text displayed above the control. */
  label: string
  /**
   * Marks the field as semantically invalid.
   *
   * When true:
   *  - The label renders in the Sloty error/destructive color (`--sloty-danger`).
   *  - The control is expected to carry `aria-invalid="true"` (callers must add
   *    this attribute to the actual `<input>` / `<select>` / `<textarea>`).
   *
   * Does NOT automatically render an error paragraph — that is controlled
   * separately by `errorMessage`.
   */
  error?: boolean
  /**
   * Optional textual explanation of what went wrong.
   *
   * Rendered as a `<p>` below the control ONLY when both this prop is provided
   * AND `error` is true. Keeping these two concepts separate lets callers show
   * only a label-level visual indicator (error=true, errorMessage=undefined)
   * while the actual message appears elsewhere (e.g. a card-level banner).
   */
  errorMessage?: string
  /** Optional explicit `id` forwarded to the label's `htmlFor`. */
  htmlFor?: string
  className?: string
  children: ReactNode
}

/**
 * Reusable form-field shell that separates field-invalid state from textual
 * error copy.
 *
 * ```tsx
 * // Payment reference — label turns red, aria-invalid flows to input,
 * // but no inline error text (message lives in the card-level banner).
 * <FormField label="مرجع الدفع" error={!!referenceFieldError}>
 *   <input aria-invalid={!!referenceFieldError} ... />
 * </FormField>
 *
 * // Amount — inline error text rendered below the input.
 * <FormField label="المبلغ" error={!!amountError} errorMessage={amountError ?? undefined}>
 *   <input aria-invalid={!!amountError} ... />
 * </FormField>
 * ```
 */
export function FormField({
  label,
  error = false,
  errorMessage,
  htmlFor,
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={className}>
      <label
        className="block space-y-2 text-sm font-bold"
        htmlFor={htmlFor}
      >
        <span
          className={
            error
              ? 'text-[var(--sloty-danger)]'
              : 'text-[var(--sloty-text-primary)]'
          }
        >
          {label}
        </span>
        {children}
      </label>
      {error && errorMessage ? (
        <p className="-mt-2 text-xs font-bold text-[var(--sloty-danger)]">
          {errorMessage}
        </p>
      ) : null}
    </div>
  )
}

