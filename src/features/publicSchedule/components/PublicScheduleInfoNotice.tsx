import { useEffect, useRef } from 'react'
import { Info, X } from 'lucide-react'

export interface PublicScheduleInfoNoticeProps {
  onDismiss: () => void
  timeoutMs?: number
}

/**
 * Informational toast notice shown when a guest clicks an available slot on the public schedule.
 * Explains that booking is staff-only, players view availability only, and staff can log in above.
 */
export function PublicScheduleInfoNotice({
  onDismiss,
  timeoutMs = 4000,
}: PublicScheduleInfoNoticeProps) {
  const onDismissRef = useRef(onDismiss)

  useEffect(() => {
    onDismissRef.current = onDismiss
  }, [onDismiss])

  useEffect(() => {
    const timer = setTimeout(() => {
      onDismissRef.current()
    }, timeoutMs)

    return () => clearTimeout(timer)
  }, [timeoutMs])

  return (
    <div
      aria-live="polite"
      className="fixed inset-x-4 top-4 z-[70] mx-auto max-w-md rounded-2xl border border-[var(--sloty-primary)]/30 bg-white/95 p-4 text-right shadow-xl backdrop-blur-md transition sm:left-auto sm:right-6 sm:inset-x-auto"
      dir="rtl"
      role="status"
    >
      <div className="flex items-start gap-3">
        <div
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--sloty-soft-mint)] text-[var(--sloty-primary)]"
        >
          <Info className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1 space-y-1 text-sm">
          <p className="font-extrabold text-[var(--sloty-text-primary)]">
            الحجز وتفاصيل المواعيد متاحة لفريق العمل فقط.
          </p>
          <p className="text-xs font-semibold leading-5 text-[var(--sloty-text-muted)]">
            لو أنت صاحب المكان أو أحد العاملين، سجّل الدخول من أعلى الصفحة.
          </p>
          <p className="text-xs font-medium text-[var(--sloty-text-muted)]">
            اللاعبون يقدروا يشوفوا المواعيد المتاحة فقط.
          </p>
        </div>

        <button
          aria-label="إغلاق الإشعار"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--sloty-text-muted)] hover:bg-[var(--sloty-bg)] hover:text-[var(--sloty-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--sloty-primary)]/20"
          onClick={onDismiss}
          type="button"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

