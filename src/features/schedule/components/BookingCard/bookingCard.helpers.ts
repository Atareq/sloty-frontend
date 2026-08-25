import type { ScheduleBooking } from '../../schedule.types'

export type ScheduleSlotTone =
  | 'available'
  | 'unavailable'
  | 'reserved'
  | 'cancelled'
  | 'hold'
  | 'confirmed'
  | 'completed'
  | 'no_show'

export interface ScheduleSlotPresentation {
  label: string
  isClickable: boolean
  showRecurringIcon: boolean
  tone: ScheduleSlotTone
}

const fallbackLabels: Record<ScheduleBooking['status'], string> = {
  available: 'متاح',
  unavailable: 'غير متاح',
  recurring_reserved: 'محجوز',
  cancelled: 'ملغي',
  hold: 'بانتظار العربون',
  confirmed: 'مؤكد',
  completed: 'مكتمل',
  no_show: 'عدم حضور',
}

const tones: Record<ScheduleBooking['status'], ScheduleSlotTone> = {
  available: 'available',
  unavailable: 'unavailable',
  recurring_reserved: 'reserved',
  cancelled: 'cancelled',
  hold: 'hold',
  confirmed: 'confirmed',
  completed: 'completed',
  no_show: 'no_show',
}

/** Keeps the Backend slot matrix out of the compact card markup. */
export function getScheduleSlotPresentation(
  slot: ScheduleBooking,
): ScheduleSlotPresentation {
  const isRecurringReservation = slot.status === 'recurring_reserved'
  const isFree = slot.status === 'available'
  const hasBooking = Boolean(slot.booking)

  return {
    label: isRecurringReservation
      ? fallbackLabels.recurring_reserved
      : slot.label || fallbackLabels[slot.status],
    isClickable:
      (isFree && slot.isAvailable === true) ||
      isRecurringReservation ||
      hasBooking,
    showRecurringIcon:
      isRecurringReservation ||
      Boolean(slot.booking?.is_recurring) ||
      (isFree && slot.canStartRecurring === true),
    tone: tones[slot.status],
  }
}
