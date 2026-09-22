import {
  formatBookingDetailDateTimeRange,
  type BookingDetailTimePresentation,
} from '../../bookingDetailTime.helpers'

interface BookingDetailTimeValueProps {
  presentation: BookingDetailTimePresentation
}

function BookingDetailTimeValue({
  presentation,
}: BookingDetailTimeValueProps) {
  return (
    <span className="inline-flex items-baseline gap-1" dir="ltr">
      <span>{presentation.value}</span>
      {presentation.clarification ? (
        <span
          className="text-xs font-normal text-[var(--sloty-text-muted)]"
          dir="rtl"
        >
          {presentation.clarification}
        </span>
      ) : null}
    </span>
  )
}

export interface BookingDetailTimeRangeProps {
  startTime: string
  endTime: string
  fallbackDate?: string | null
  fallbackText: string
}

/** Displays a booking time range with midnight/noon context when applicable. */
export function BookingDetailTimeRange({
  endTime,
  fallbackDate,
  fallbackText,
  startTime,
}: BookingDetailTimeRangeProps) {
  const range = formatBookingDetailDateTimeRange(
    startTime,
    endTime,
    fallbackDate,
  )

  if (!range) {
    return <>{fallbackText}</>
  }

  return (
    <>
      <span>{range.date} · </span>
      <BookingDetailTimeValue presentation={range.start} />
      <span> - </span>
      <BookingDetailTimeValue presentation={range.end} />
    </>
  )
}
