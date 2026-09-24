import { useEffect, useRef, useState } from 'react'
import { Share2 } from 'lucide-react'
import { AppSuccessNotice } from '../../../shared/components/AppSuccessNotice/AppSuccessNotice'
import { buildCourtScheduleShareUrl } from '../publicSchedule.helpers'
import { ShareCourtScheduleSheet } from './ShareCourtScheduleSheet'

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
 * Serves as the single Schedule header entry point with locked copy and visual treatment.
 * Constructs the canonical public schedule share URL once and passes it to
 * ShareCourtScheduleSheet for consistent usage across copy, share, and QR generation.
 */
export function ShareCourtScheduleButton({
  clubSlug,
  courtId,
  courtName,
  className = '',
  variant = 'header',
}: ShareCourtScheduleButtonProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [notice, setNotice] = useState<{
    message: string
    tone: 'success' | 'warning'
  } | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const copiedTimeoutRef = useRef<number | null>(null)
  const errorTimeoutRef = useRef<number | null>(null)

  const shareUrl = buildCourtScheduleShareUrl({ clubSlug, courtId })

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
    setNotice(null)
    if (errorTimeoutRef.current) {
      window.clearTimeout(errorTimeoutRef.current)
    }
    errorTimeoutRef.current = window.setTimeout(() => {
      setErrorMessage(null)
    }, 3500)
  }

  function handleCopySuccess(): void {
    setIsCopied(true)
    setNotice({ message: CONFIRMATION_MESSAGE, tone: 'success' })
    setErrorMessage(null)

    if (copiedTimeoutRef.current) {
      window.clearTimeout(copiedTimeoutRef.current)
    }
    copiedTimeoutRef.current = window.setTimeout(() => {
      setIsCopied(false)
    }, 1500)
  }

  function handleDownloadSuccess(): void {
    setNotice({ message: 'تم تحميل صورة QR', tone: 'success' })
    setErrorMessage(null)
  }

  function handleInfo(message: string): void {
    setNotice({ message, tone: 'warning' })
    setErrorMessage(null)
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
        onClick={() => setIsSheetOpen(true)}
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

      <ShareCourtScheduleSheet
        courtName={courtName}
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        onCopySuccess={handleCopySuccess}
        onDownloadSuccess={handleDownloadSuccess}
        onError={showError}
        onInfo={handleInfo}
        shareUrl={shareUrl}
      />

      {notice ? (
        <AppSuccessNotice
          message={notice.message}
          onDismiss={() => setNotice(null)}
          tone={notice.tone}
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
