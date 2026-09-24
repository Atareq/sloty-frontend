import { useMemo } from 'react'
import { generateScheduleQrShareCardSvg } from './scheduleQrShareCard.helpers'

export interface ScheduleQrShareCardProps {
  courtName?: string
  qrSvg?: string | null
  cardSvg?: string | null
  qrError?: boolean
  className?: string
}

/**
 * Premium branded QR schedule share card component.
 *
 * Used for both on-screen responsive preview and high-resolution PNG export.
 * Follows the approved visual reference with:
 * - Top green accent bar
 * - Football court geometric line motifs
 * - Dynamic court name
 * - Subtitle: جدول المواعيد المتاحة
 * - Centered, high-contrast QR inside white container
 * - Instruction: امسح الكود لعرض مواعيد الملعب
 * - Sloty footer branding
 */
export function ScheduleQrShareCard({
  courtName,
  qrSvg,
  cardSvg: providedCardSvg,
  qrError = false,
  className = '',
}: ScheduleQrShareCardProps) {
  const courtDisplayName = courtName || 'الملعب'

  const cardSvg = useMemo(() => {
    if (providedCardSvg) {
      return providedCardSvg
    }
    if (!qrSvg) {
      return null
    }
    return generateScheduleQrShareCardSvg({
      courtName,
      qrSvg,
    })
  }, [providedCardSvg, courtName, qrSvg])

  return (
    <div
      className={[
        'relative flex w-full max-w-[340px] sm:max-w-[380px] flex-col items-center justify-center overflow-hidden rounded-2xl shadow-md transition',
        className,
      ].join(' ')}
      data-testid="schedule-qr-share-card"
    >
      {qrError ? (
        <div className="flex h-72 w-full flex-col items-center justify-center p-4 text-center">
          <p className="text-sm font-bold text-red-600">
            تعذر تجهيز صورة QR حاليًا.
          </p>
        </div>
      ) : cardSvg ? (
        <>
          <img
            alt={`QR لعرض جدول مواعيد ${courtDisplayName}`}
            className="h-auto w-full object-contain"
            src={`data:image/svg+xml;utf8,${encodeURIComponent(cardSvg)}`}
          />
          {/* Accessible metadata */}
          <span className="sr-only">{courtDisplayName}</span>
          <span className="sr-only">جدول المواعيد المتاحة</span>
          <span className="sr-only">امسح الكود لعرض مواعيد الملعب</span>
          <span className="sr-only">Sloty</span>
        </>
      ) : null}
    </div>
  )
}
