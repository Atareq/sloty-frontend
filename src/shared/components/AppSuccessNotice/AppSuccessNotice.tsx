import { useEffect, useRef } from 'react'

export interface AppSuccessNoticeProps {
  message: string
  onDismiss: () => void
  /** Optional bold title shown above the message body. */
  title?: string
  /**
   * Visual treatment. `warning` uses the existing amber style for informational
   * feedback that is not a hard failure.
   */
  tone?: 'success' | 'warning'
  /** Temporary feedback duration in milliseconds. Defaults to 3 seconds. */
  timeoutMs?: number
}

const toneClassName: Record<
  NonNullable<AppSuccessNoticeProps['tone']>,
  string
> = {
  success:
    'border-[var(--sloty-primary)]/20 bg-[var(--sloty-soft-mint)] text-[var(--sloty-primary-dark)]',
  warning: 'border-amber-200 bg-amber-50 text-amber-950',
}

/**
 * Lightweight canonical floating feedback.
 *
 * Features own the message string. Blocking errors stay local to sheets and
 * must not use this primitive.
 */
export function AppSuccessNotice({
  message,
  onDismiss,
  timeoutMs = 3000,
  title,
  tone = 'success',
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
  }, [message, timeoutMs, title, tone])

  return (
    <div
      aria-live="polite"
      className={[
        'fixed left-4 top-[calc(env(safe-area-inset-top,0px)+1rem)] z-[70] max-w-[calc(100vw-2rem)] whitespace-pre-line rounded-2xl border px-4 py-3 text-sm shadow-[var(--sloty-shadow)] sm:max-w-sm',
        toneClassName[tone],
      ].join(' ')}
      role="status"
    >
      {title ? <p className="font-black leading-5">{title}</p> : null}
      <p className={title ? 'mt-1 font-semibold leading-5' : 'font-semibold'}>
        {message}
      </p>
    </div>
  )
}
