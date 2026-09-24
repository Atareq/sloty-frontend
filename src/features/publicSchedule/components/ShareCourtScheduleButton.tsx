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
  mobileIconOnly?: boolean
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
  mobileIconOnly = false,
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
        : 'border border-white/70 bg-white text-[var(--sloty-primary-dark)] shadow-sm hover:bg-[var(--sloty-soft-mint)] focus:ring-white/80'
      : isCopied
        ? 'border-emerald-300 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-400/20'
        : 'border-[var(--sloty-border)] bg-[var(--sloty-surface)] text-[var(--sloty-text-primary)] hover:bg-[var(--sloty-bg)] focus:ring-[var(--sloty-primary)]/20'

  return (
    <>
      <button
        aria-label={isCopied ? 'تم النسخ' : 'مشاركة الجدول'}
        className={[
          'inline-flex h-11 max-w-full min-w-0 items-center justify-center gap-1.5 rounded-2xl text-sm font-bold transition focus:outline-none focus:ring-2',
          mobileIconOnly ? 'w-11 px-0 sm:w-auto sm:px-3.5' : 'px-3.5',
          variant === 'secondary' ? 'border shadow-xs' : '',
          baseStyles,
          className,
        ].join(' ')}
        data-testid="share-court-schedule-button"
        onClick={() => setIsSheetOpen(true)}
        type="button"
      >
        {isCopied ? (
          mobileIconOnly ? (
            <span>
              ✓<span className="hidden sm:inline"> تم النسخ</span>
            </span>
          ) : (
            <span>✓ تم النسخ</span>
          )
        ) : (
          <>
            <Share2
              aria-hidden="true"
              className={
                mobileIconOnly
                  ? 'h-5 w-5 shrink-0 sm:h-4 sm:w-4'
                  : 'h-4 w-4 shrink-0'
              }
            />
            <span
              className={
                mobileIconOnly ? 'hidden sm:inline truncate' : 'truncate'
              }
            >
              مشاركة الجدول
            </span>
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
