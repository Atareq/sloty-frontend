import type {
  BookingSlot,
  BookingSlotsResponse,
} from '../../features/schedule/scheduleApi.types'
import type { ScheduleDaySnapshot } from '../repositories/offlineRepositories'

function groupSlotsByDate(slots: BookingSlot[]): Map<string, BookingSlot[]> {
  const grouped = new Map<string, BookingSlot[]>()

  for (const slot of slots) {
    const slotsForDate = grouped.get(slot.date) ?? []

    slotsForDate.push(slot)
    grouped.set(slot.date, slotsForDate)
  }

  return grouped
}

/**
 * Converts the backend range payload into one stored row per requested date.
 *
 * Missing dates become synchronized empty-day markers. The frontend does not
 * create availability or recurrence; it only partitions backend slot objects by
 * their authoritative `slot.date`.
 */
export function buildScheduleDaySnapshots(
  response: BookingSlotsResponse,
  dates: string[],
): ScheduleDaySnapshot[] {
  const grouped = groupSlotsByDate(response.slots)
  const rangeHadNoSlots = response.slots.length === 0

  return dates.map((date) => ({
    date,
    message: rangeHadNoSlots ? response.message ?? null : null,
    slots: grouped.get(date) ?? [],
  }))
}
