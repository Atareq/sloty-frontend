import { useId, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowRight, Download, QrCode, Share2 } from 'lucide-react'
import { AppSheet } from '../../../shared/components/AppSheet/AppSheet'
import { AppButton } from '../../../shared/components/AppButton/AppButton'
import {
  downloadBlob,
  generateQrSvg,
  getCourtScheduleQrFilename,
  qrSvgToPngBlob,
} from '../../../shared/utils/qrCode'
import { ScheduleQrShareCard } from './ScheduleQrShareCard'
import { generateScheduleQrShareCardSvg } from './scheduleQrShareCard.helpers'

export interface ShareCourtScheduleSheetProps {
  isOpen: boolean
  onClose: () => void
  shareUrl: string
  courtName?: string
  onCopySuccess: () => void
  onDownloadSuccess: () => void
  onInfo: (message: string) => void
  onError: (message: string) => void
}

type ShareView = 'choices' | 'qr'

/**
 * Share Sheet for public court schedule.
 *
 * Presentation-oriented dialog with two cleanly separated workflows:
 * 1. Choices view: Share Link (URL workflow) or QR for schedule.
 * 2. QR view: Premium branded QR card preview, Share QR image, and Download QR image.
 *
 * Receives the canonical shareUrl directly. Does not own route or URL generation.
 */
export function ShareCourtScheduleSheet({
  isOpen,
  onClose,
  shareUrl,
  courtName,
  onCopySuccess,
  onDownloadSuccess,
  onInfo,
  onError,
}: ShareCourtScheduleSheetProps) {
  const [view, setView] = useState<ShareView>('choices')
  const choicesTitleId = useId()
  const qrTitleId = useId()

  const courtDisplayName = courtName || 'الملعب'
  const scheduleTitle = `مواعيد ${courtDisplayName}`
  const shareLinkText = 'شوف المواعيد المتاحة من هنا:'
  const shareQrText = courtName
    ? `مواعيد ${courtName}\nامسح الـ QR أو افتح الرابط لمشاهدة المواعيد المتاحة.`
    : 'امسح الـ QR أو افتح الرابط لمشاهدة المواعيد المتاحة.'

  const { cardSvg, qrError } = useMemo(() => {
    if (view !== 'qr') {
      return { cardSvg: null, qrError: false }
    }
    try {
      const rawQr = generateQrSvg(shareUrl, { size: 640, margin: 4 })
      const card = generateScheduleQrShareCardSvg({
        courtName,
        qrSvg: rawQr,
      })
      return { cardSvg: card, qrError: false }
    } catch {
      return { cardSvg: null, qrError: true }
    }
  }, [view, shareUrl, courtName])

  function handleClose(): void {
    setView('choices')
    onClose()
  }

  async function copyPublicUrl(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(shareUrl)
        onCopySuccess()
        handleClose()
        return true
      } catch {
        onError('تعذر نسخ الرابط إلى الحافظة.')
        return false
      }
    } else {
      onError('المشاركة غير مدعومة على هذا المتصفح.')
      return false
    }
  }

  async function handleShareLink(): Promise<void> {
    if (
      typeof navigator !== 'undefined' &&
      typeof navigator.share === 'function'
    ) {
      try {
        await navigator.share({
          title: scheduleTitle,
          text: shareLinkText,
          url: shareUrl,
        })
        handleClose()
        return
      } catch (err: unknown) {
        if ((err as Error)?.name === 'AbortError') {
          return
        }
        await copyPublicUrl()
        return
      }
    }

    await copyPublicUrl()
  }

  async function handleShareQr(): Promise<void> {
    if (!cardSvg) return

    const blob = await qrSvgToPngBlob(cardSvg, 1080, 1350)
    if (!blob) {
      onError('تعذر تجهيز صورة QR حاليًا.')
      return
    }

    const fileName = getCourtScheduleQrFilename(courtName)
    const file = new File([blob], fileName, { type: 'image/png' })

    const canShareFiles =
      typeof navigator !== 'undefined' &&
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [file] }) &&
      typeof navigator.share === 'function'

    if (canShareFiles) {
      try {
        await navigator.share({
          files: [file],
          title: scheduleTitle,
          text: shareQrText,
        })
        handleClose()
        return
      } catch (err: unknown) {
        if ((err as Error)?.name === 'AbortError') {
          return
        }
        onError('تعذر تجهيز صورة QR حاليًا.')
        return
      }
    }

    // File sharing is unsupported on this device:
    // DO NOT fall back to URL sharing. Instead, show informational message:
    // 'مشاركة الصورة مش متاحة على الجهاز ده. تقدر تحمّل صورة QR بدلًا من كده.'
    // and keep 'تحميل صورة QR' available.
    onInfo('مشاركة الصورة مش متاحة على الجهاز ده. تقدر تحمّل صورة QR بدلًا من كده.')
  }

  async function handleDownloadQr(): Promise<void> {
    if (!cardSvg) return

    const blob = await qrSvgToPngBlob(cardSvg, 1080, 1350)
    if (!blob) {
      onError('تعذر تجهيز صورة QR حاليًا.')
      return
    }

    const fileName = getCourtScheduleQrFilename(courtName)
    downloadBlob(blob, fileName)
    onDownloadSuccess()
    handleClose()
  }

  return createPortal(
    <AppSheet
      ariaLabel={view === 'choices' ? 'مشاركة الجدول' : 'QR للجدول'}
      className={view === 'qr' ? 'md:max-w-md' : 'md:max-w-sm'}
      isOpen={isOpen}
      onRequestClose={handleClose}
    >
      <div className="p-4 sm:p-5 pt-10 sm:pt-12 text-right" dir="rtl">
        {view === 'choices' ? (
          <div className="space-y-4">
            <div className="space-y-1">
              <h2
                className="text-xl font-black text-[var(--sloty-text-primary)]"
                id={choicesTitleId}
              >
                مشاركة الجدول
              </h2>
              <p className="text-sm font-semibold text-[var(--sloty-text-muted)]">
                شارك مواعيد الملعب مع اللاعبين بسهولة.
              </p>
            </div>

            <div className="space-y-2.5 pt-2">
              <button
                className="flex min-h-12 w-full items-center justify-between rounded-2xl border border-[var(--sloty-border)] bg-[var(--sloty-surface)] px-4 py-3 text-sm font-bold text-[var(--sloty-text-primary)] shadow-2xs transition hover:bg-[var(--sloty-bg)] hover:border-[var(--sloty-primary)]/30 focus:outline-none focus:ring-2 focus:ring-[var(--sloty-primary)]/20"
                onClick={handleShareLink}
                type="button"
              >
                <div className="flex items-center gap-3">
                  <Share2
                    aria-hidden="true"
                    className="h-5 w-5 shrink-0 text-[var(--sloty-primary-dark)]"
                  />
                  <span>مشاركة الرابط</span>
                </div>
              </button>

              <button
                className="flex min-h-12 w-full items-center justify-between rounded-2xl border border-[var(--sloty-border)] bg-[var(--sloty-surface)] px-4 py-3 text-sm font-bold text-[var(--sloty-text-primary)] shadow-2xs transition hover:bg-[var(--sloty-bg)] hover:border-[var(--sloty-primary)]/30 focus:outline-none focus:ring-2 focus:ring-[var(--sloty-primary)]/20"
                onClick={() => setView('qr')}
                type="button"
              >
                <div className="flex items-center gap-3">
                  <QrCode
                    aria-hidden="true"
                    className="h-5 w-5 shrink-0 text-[var(--sloty-primary-dark)]"
                  />
                  <span>QR للجدول</span>
                </div>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <button
                aria-label="الرجوع"
                className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--sloty-text-muted)] transition hover:bg-[var(--sloty-bg)] hover:text-[var(--sloty-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--sloty-primary)]/20"
                onClick={() => setView('choices')}
                type="button"
              >
                <ArrowRight aria-hidden="true" className="h-5 w-5" />
              </button>
              <h2
                className="text-xl font-black text-[var(--sloty-text-primary)]"
                id={qrTitleId}
              >
                QR للجدول
              </h2>
            </div>

            <div className="flex w-full min-w-0 flex-col items-center justify-center py-1.5 sm:py-2">
              <ScheduleQrShareCard
                cardSvg={cardSvg}
                courtName={courtName}
                qrError={qrError}
              />
            </div>

            <div className="space-y-2 pt-1">
              <AppButton
                className="gap-2"
                fullWidth
                onClick={handleShareQr}
                type="button"
                variant="primary"
              >
                <Share2 aria-hidden="true" className="h-4 w-4 shrink-0" />
                <span>مشاركة صورة QR</span>
              </AppButton>

              <AppButton
                className="gap-2"
                fullWidth
                onClick={handleDownloadQr}
                type="button"
                variant="secondary"
              >
                <Download aria-hidden="true" className="h-4 w-4 shrink-0" />
                <span>تحميل صورة QR</span>
              </AppButton>
            </div>
          </div>
        )}
      </div>
    </AppSheet>,
    document.body,
  )
}
