import { useEffect, useRef, useState } from 'react'
import { Share2 } from 'lucide-react'
import { buildPublicCourtScheduleUrl } from '../publicSchedule.helpers'
import { AppSuccessNotice } from '../../../shared/components/AppSuccessNotice/AppSuccessNotice'

export interface ShareCourtScheduleButtonProps {
  clubSlug: string
  courtId: string | number
  courtName?: string
  className?: string
  variant?: 'header' | 'secondary'
}

const CONFIRMATION_MESSAGE = `تم نسخ رابط الجدول
الرابط جاهز للمشاركة مع اللاعبين.`

/**
 * Share button for public court schedule.
 *
 * Implements native sharing on mobile/supported platforms and falls back to
 * clipboard copy on desktop. Preserves locked UI copy and feedback states.
 */
export function ShareCourtScheduleButton({
  clubSlug,
  courtId,
  courtName,
  className = '',
  variant = 'header',
}: ShareCourtScheduleButtonProps) {
  const [isCopied, setIsCopied] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const copiedTimeoutRef = useRef<number | null>(null)
  const errorTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current) {
        window.clearTimeout(copiedTimeoutRef.current)
      }
      if (errorTimeoutRef.current) {
        window.clearTimeout(errorTimeoutRef.current)
      }
    }
  }, [])

  function showError(message: string): void {
    setErrorMessage(message)
    if (errorTimeoutRef.current) {
      window.clearTimeout(errorTimeoutRef.current)
    }
    errorTimeoutRef.current = window.setTimeout(() => {
      setErrorMessage(null)
    }, 3500)
  }

  async function handleShare(): Promise<void> {
    const publicUrl = buildPublicCourtScheduleUrl(clubSlug, courtId)
    const title = courtName ? `جدول ${courtName}` : 'جدول الملعب'
    const text = courtName ? `جدول مواعيد ${courtName}` : 'جدول مواعيد الملعب'

    // When navigator.share exists -> native share
    if (
      typeof navigator !== 'undefined' &&
      typeof navigator.share === 'function'
    ) {
      try {
        await navigator.share({
          title,
          text,
          url: publicUrl,
        })
        return
      } catch (err: unknown) {
        // If it rejects with AbortError: no error, no clipboard fallback, no copied state
        if ((err as Error)?.name === 'AbortError') {
          return
        }
        // If native share rejected with other error, show lightweight error
        showError('تعذر إتمام المشاركة.')
        return
      }
    }

    // When native share is unavailable -> clipboard.writeText(publicUrl)
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(publicUrl)
        setIsCopied(true)
        setShowConfirmation(true)
        setErrorMessage(null)

        if (copiedTimeoutRef.current) {
          window.clearTimeout(copiedTimeoutRef.current)
        }
        copiedTimeoutRef.current = window.setTimeout(() => {
          setIsCopied(false)
        }, 2000)
      } catch {
        setIsCopied(false)
        showError('تعذر نسخ الرابط إلى الحافظة.')
      }
    } else {
      setIsCopied(false)
      showError('المشاركة غير مدعومة على هذا المتصفح.')
    }
  }

  const baseStyles =
    variant === 'header'
      ? isCopied
        ? 'bg-emerald-600 text-white ring-2 ring-emerald-400'
        : 'bg-white/15 text-white hover:bg-white/25 focus:ring-white/70'
      : isCopied
        ? 'border-emerald-300 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-400/20'
        : 'border-[var(--sloty-border)] bg-[var(--sloty-surface)] text-[var(--sloty-text-primary)] hover:bg-[var(--sloty-bg)] focus:ring-[var(--sloty-primary)]/20'

  return (
    <>
      <button
        aria-label={isCopied ? 'تم النسخ' : 'مشاركة الجدول'}
        className={[
          'inline-flex h-11 items-center justify-center gap-1.5 rounded-2xl px-3.5 text-sm font-bold transition focus:outline-none focus:ring-2',
          variant === 'secondary' ? 'border shadow-xs' : '',
          baseStyles,
          className,
        ].join(' ')}
        data-testid="share-court-schedule-button"
        onClick={handleShare}
        type="button"
      >
        {isCopied ? (
          <span>✓ تم النسخ</span>
        ) : (
          <>
            <Share2 aria-hidden="true" className="h-4 w-4 shrink-0" />
            <span>مشاركة الجدول</span>
          </>
        )}
      </button>

      {showConfirmation ? (
        <AppSuccessNotice
          message={CONFIRMATION_MESSAGE}
          onDismiss={() => setShowConfirmation(false)}
        />
      ) : null}

      {errorMessage ? (
        <div
          aria-live="assertive"
          className="fixed left-4 top-4 z-[70] max-w-sm rounded-2xl border border-red-500/20 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800 shadow-[var(--sloty-shadow)]"
          role="alert"
        >
          {errorMessage}
        </div>
      ) : null}
    </>
  )
}
