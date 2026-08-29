import { MoneySummaryCard } from '../MoneySummaryCard/MoneySummaryCard'
import type { ScheduleSummary as ScheduleSummaryData } from '../../schedule.types'
import { bookingStatusCopy } from '../../../../shared/copy/appCopy'

export interface ScheduleSummaryProps {
  summary: ScheduleSummaryData
}

/** Lightweight operational totals shown between Schedule controls and actions. */
export function ScheduleSummary({ summary }: ScheduleSummaryProps) {
  return (
    <section
      aria-label="ملخص فترات الحجز"
      className="grid grid-cols-3 divide-x divide-x-reverse divide-[var(--sloty-border)] overflow-hidden rounded-2xl border border-[var(--sloty-border)] bg-[var(--sloty-surface)] shadow-[var(--sloty-shadow)]"
    >
      <MoneySummaryCard
        label="متاح"
        tone="success"
        value={summary.availableCount}
      />
      <MoneySummaryCard
        label={bookingStatusCopy.CONFIRMED}
        tone="success"
        value={summary.confirmedCount}
      />
      <MoneySummaryCard label="إجمالي الفترات" value={summary.totalSlots} />
    </section>
  )
}
