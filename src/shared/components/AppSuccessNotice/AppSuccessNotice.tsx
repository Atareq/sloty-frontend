import { useEffect, useRef } from 'react'

export interface AppSuccessNoticeProps {
  message: string
  onDismiss: () => void
  /** Temporary success feedback duration in milliseconds. Defaults to 3 seconds. */
  timeoutMs?: number
}

/**
 * Lightweight canonical success feedback.
 *
 * Features own the message string. Errors that need attention stay local and
 * must not use this primitive.
 */
export function AppSuccessNotice({
  message,
  onDismiss,
  timeoutMs = 3000,
}: AppSuccessNoticeProps) {
  const onDismissRef = useRef(onDismiss)

  useEffect(() => {
    onDismissRef.current = onDismiss
  }, [onDismiss])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      onDismissRef.current()
    }, timeoutMs)

    return () => window.clearTimeout(timeoutId)
  }, [message, timeoutMs])

  return (
    <div
      aria-live="polite"
      className="fixed left-4 top-4 z-[70] max-w-sm rounded-2xl border border-[var(--sloty-primary)]/20 bg-[var(--sloty-soft-mint)] px-4 py-3 text-sm font-semibold text-[var(--sloty-primary-dark)] shadow-[var(--sloty-shadow)]"
      role="status"
    >
      {message}
    </div>
  )
}
