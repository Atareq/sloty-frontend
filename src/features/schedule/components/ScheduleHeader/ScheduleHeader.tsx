import { MoneySummaryCard } from '../MoneySummaryCard/MoneySummaryCard'
import type {
  ScheduleCourt,
  ScheduleStaff,
  ScheduleSummary,
} from '../../schedule.types'

export interface ScheduleHeaderProps {
  court: ScheduleCourt
  staff: ScheduleStaff
  summary: ScheduleSummary
}

/**
 * Responsive staff schedule header.
 *
 * It combines identity, selected date, and availability summary before the
 * slot cards. Date navigation lives in AppDateNavigator so Schedule keeps one
 * selected YYYY-MM-DD value.
 */
export function ScheduleHeader({
  court,
  staff,
  summary,
}: ScheduleHeaderProps) {
  return (
    <header className="sticky top-0 z-30 overflow-hidden border-b border-[var(--sloty-border)] bg-[var(--sloty-surface)] md:static md:rounded-2xl md:border md:shadow-[var(--sloty-shadow)]">
      <div className="sloty-green-surface relative flex items-center justify-between gap-3 overflow-hidden px-4 pb-4 pt-5 text-white md:px-5 md:py-6 lg:px-6">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-white/80">
            جدول اليوم
          </p>
          <h1 className="truncate text-lg font-black text-white md:text-2xl">
            {court.clubName} - {court.courtName}
          </h1>
          <p className="mt-1 text-xs text-white/80 md:text-sm">
            {court.dateLabel}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="text-left">
            <p className="text-xs font-bold text-white">
              {staff.name}
            </p>
            <p className="text-[11px] text-white/75">
              {staff.role}
            </p>
          </div>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm font-black text-[var(--sloty-primary)]">
            {staff.name.charAt(0)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 divide-x divide-y divide-x-reverse divide-[var(--sloty-border)] border-y border-[var(--sloty-border)] bg-[var(--sloty-bg)] sm:grid-cols-4 sm:divide-y-0 md:mx-5 md:rounded-2xl md:border lg:mx-6">
        <MoneySummaryCard
          label="متاح"
          tone="success"
          value={summary.availableCount}
        />
        <MoneySummaryCard
          label="مؤكد"
          tone="success"
          value={summary.confirmedCount}
        />
        <MoneySummaryCard
          label="ملغي"
          tone="default"
          value={summary.cancelledCount}
        />
        <MoneySummaryCard
          label="إجمالي الفترات"
          value={summary.totalSlots}
        />
      </div>
    </header>
  )
}
