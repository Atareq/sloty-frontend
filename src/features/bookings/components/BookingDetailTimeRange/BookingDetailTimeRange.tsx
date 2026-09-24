import {
  formatBookingDetailDateTimeRange,
  type BookingDetailDateTimeRange,
  type BookingDetailTimePresentation,
} from '../../bookingDetailTime.helpers'
import { StatusChip } from '../../../../shared/components/StatusChip/StatusChip'

export interface BookingDetailTimeRangePresentationProps {
  start: BookingDetailTimePresentation
  end: BookingDetailTimePresentation
}

/** Renders the canonical RTL booking-detail range and optional time context. */
export function BookingDetailTimeRangePresentation({
  end,
  start,
}: BookingDetailTimeRangePresentationProps) {
  return (
    <div className="flex w-full items-center justify-between gap-3" dir="rtl">
      <p
        className="shrink-0 text-lg font-black text-[var(--sloty-primary-dark)]"
        dir="ltr"
      >
        {end.value} - {start.value}
      </p>

      {start.clarification ? (
        <div className="shrink-0">
          <StatusChip label={start.clarification} status="confirmed" />
        </div>
      ) : null}
    </div>
  )
}

export interface BookingDetailTimeRangeProps {
  startTime: string
  endTime: string
  fallbackDate?: string | null
  fallbackText: string
  timeRange?: BookingDetailDateTimeRange | null
}

/** Displays a booking time range with midnight/noon context when applicable. */
export function BookingDetailTimeRange({
  endTime,
  fallbackDate,
  fallbackText,
  startTime,
  timeRange,
}: BookingDetailTimeRangeProps) {
  const range =
    timeRange ??
    formatBookingDetailDateTimeRange(startTime, endTime, fallbackDate)

  if (!range) {
    return <>{fallbackText}</>
  }

  return (
    <BookingDetailTimeRangePresentation
      end={range.end}
      start={range.start}
    />
  )
}
