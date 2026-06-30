import { MoneySummaryCard } from '../MoneySummaryCard/MoneySummaryCard'
import type {
  ScheduleCourt,
  ScheduleDateFilter,
  ScheduleStaff,
  ScheduleSummary,
} from '../../schedule.types'

export interface ScheduleHeaderProps {
  court: ScheduleCourt
  staff: ScheduleStaff
  summary: ScheduleSummary
  dateFilters: ScheduleDateFilter[]
  activeDateKey: string
  onDateChange?: (key: string) => void
}

function formatNumber(value: number): string {
  return value.toLocaleString('ar-EG')
}

/**
 * Responsive staff schedule header.
 *
 * It combines identity, today's date, fast money/booking summary, and date
 * tabs so staff can understand the day before scanning slot cards. The header
 * starts compact on mobile and expands into a desktop card with a wider top row
 * and four-column summary.
 */
export function ScheduleHeader({
  court,
  staff,
  summary,
  dateFilters,
  activeDateKey,
  onDateChange,
}: ScheduleHeaderProps) {
  return (
    <header className="sticky top-0 z-30 overflow-hidden border-b border-[var(--sloty-border)] bg-[var(--sloty-surface)] md:static md:rounded-2xl md:border md:shadow-[var(--sloty-shadow)]">
      <div
        className="relative flex items-center justify-between gap-3 overflow-hidden px-4 pb-4 pt-5 text-white md:px-5 md:py-6 lg:px-6"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(6, 78, 59, 0.96), rgba(11, 107, 58, 0.82)), url('/images/sloty-green-surface-bg.png')",
          backgroundPosition: 'center',
          backgroundSize: 'cover',
        }}
      >
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
        <MoneySummaryCard label="حجوزات" value={summary.bookingCount} />
        <MoneySummaryCard
          label="انتظار"
          tone={summary.holdCount > 0 ? 'warning' : 'default'}
          value={summary.holdCount}
        />
        <MoneySummaryCard
          label="محصل"
          suffix="ج"
          tone="success"
          value={formatNumber(summary.collectedAmount)}
        />
        <MoneySummaryCard
          label="متبقي"
          suffix="ج"
          tone={summary.remainingAmount > 0 ? 'danger' : 'success'}
          value={formatNumber(summary.remainingAmount)}
        />
      </div>

      <div className="flex gap-2 overflow-x-auto px-4 py-2.5 md:px-5 md:py-4 lg:px-6">
        {dateFilters.map((filter) => {
          const isActive = activeDateKey === filter.key

          return (
            <button
              className={[
                'h-9 shrink-0 rounded-xl px-4 text-sm font-bold transition',
                isActive
                  ? 'bg-[var(--sloty-primary)] text-white'
                  : 'bg-[var(--sloty-bg)] text-[var(--sloty-text-muted)] hover:text-[var(--sloty-text-primary)]',
              ].join(' ')}
              key={filter.key}
              onClick={() => onDateChange?.(filter.key)}
              type="button"
            >
              {filter.label}
            </button>
          )
        })}
      </div>
    </header>
  )
}
