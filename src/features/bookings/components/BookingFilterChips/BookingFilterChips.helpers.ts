import type { BookingsQueryParams } from '../../bookings.types'
import { bookingStatusLabels } from '../../bookings.types'

const chipFilterKeys = [
  'court',
  'date',
  'date_from',
  'date_to',
  'ended',
  'hold_expiring',
  'needs_action',
  'overdue',
  'search',
  'upcoming',
  'has_remaining_amount',
  'status',
] as const

export type BookingFilterChipKey = (typeof chipFilterKeys)[number]

function getChipLabel(
  key: BookingFilterChipKey,
  value: string | number | boolean,
  courtLabels: Record<string, string>,
): string {
  if (key === 'date') {
    return `تاريخ ${value}`
  }

  if (key === 'date_from') {
    return `من ${value}`
  }

  if (key === 'date_to') {
    return `إلى ${value}`
  }

  if (key === 'court') {
    return courtLabels[String(value)] ?? `ملعب #${value}`
  }

  if (key === 'status') {
    return (
      bookingStatusLabels[String(value) as keyof typeof bookingStatusLabels]
      ?? String(value)
    )
  }

  if (key === 'needs_action') {
    return 'تحتاج إجراء'
  }

  if (key === 'overdue') {
    return 'وقتها عدى'
  }

  if (key === 'has_remaining_amount') {
    return 'بها مبلغ متبقي'
  }

  if (key === 'upcoming') {
    return 'قادمة'
  }

  if (key === 'search') {
    return `بحث: ${value}`
  }

  if (key === 'ended') {
    return 'انتهى وقتها'
  }

  if (key === 'hold_expiring') {
    return 'قاربت على الانتهاء'
  }

  return String(value)
}

export function getActiveBookingFilterChips(
  params: BookingsQueryParams,
  courtLabels: Record<string, string> = {},
): Array<{ key: BookingFilterChipKey; label: string }> {
  return chipFilterKeys.flatMap((key) => {
    const value = params[key]

    if (value === undefined || value === '') {
      return []
    }

    return [{ key, label: getChipLabel(key, value, courtLabels) }]
  })
}
