import type { BookingSlot } from '../../features/schedule/scheduleApi.types'
import { isPastSlot } from '../../features/schedule/scheduleBoard.helpers'
import type {
  BookingIntentRecord,
  BookingIntentStatus,
  OfflineScope,
  ScheduleDayRecord,
} from '../offline.types'
import {
  offlineRepositories,
  type BookingIntentUpdate,
} from '../repositories/offlineRepositories'

export const ACTIVE_BOOKING_INTENT_STATUSES: BookingIntentStatus[] = [
  'PENDING_RECHECK',
  'READY_TO_BOOK',
  'CONFLICT',
  'EXPIRED',
]

export const RECHECKABLE_BOOKING_INTENT_STATUSES: BookingIntentStatus[] = [
  'PENDING_RECHECK',
  'READY_TO_BOOK',
  'CONFLICT',
]

export function getBookingIntentStatusLabel(
  status: BookingIntentStatus,
): string {
  switch (status) {
    case 'PENDING_RECHECK':
      return 'بانتظار التأكيد'
    case 'READY_TO_BOOK':
      return 'المعاد متاح'
    case 'CONFLICT':
      return 'المعاد مبقاش متاح'
    case 'BOOKED':
      return 'تم الحجز'
    case 'DISMISSED':
      return 'تم تجاهل الطلب'
    case 'EXPIRED':
      return 'انتهى الطلب'
  }
}

export function getSlotWallTime(value: string): string {
  const timePart = value.includes('T') ? value.split('T')[1] : value

  return timePart.slice(0, 5)
}

function getRequestedEnd(intent: BookingIntentRecord): string {
  return getSlotWallTime(intent.requested_end)
}

export function isBookingIntentExpired(
  intent: BookingIntentRecord,
  now = new Date(),
): boolean {
  return isPastSlot(intent.requested_date, getRequestedEnd(intent), now)
}

export function findExactBookingIntentSlot(
  intent: Pick<
    BookingIntentRecord,
    'court_id' | 'requested_date' | 'requested_start' | 'requested_end'
  >,
  scheduleDay: Pick<ScheduleDayRecord, 'court_id' | 'date' | 'slots'>,
): BookingSlot | null {
  if (
    scheduleDay.court_id !== intent.court_id ||
    scheduleDay.date !== intent.requested_date
  ) {
    return null
  }

  const requestedStart = getSlotWallTime(intent.requested_start)
  const requestedEnd = getSlotWallTime(intent.requested_end)

  return (
    scheduleDay.slots.find(
      (slot) =>
        slot.date === intent.requested_date &&
        getSlotWallTime(slot.start_time) === requestedStart &&
        getSlotWallTime(slot.end_time) === requestedEnd,
    ) ?? null
  )
}

export function isAuthoritativeFreeSlot(slot: BookingSlot | null): boolean {
  return slot?.slot_status === 'FREE' && slot.is_available === true
}

export function classifyBookingIntentFromSchedule(
  intent: BookingIntentRecord,
  scheduleDay: ScheduleDayRecord,
  now = new Date(),
): BookingIntentStatus {
  if (isBookingIntentExpired(intent, now)) {
    return 'EXPIRED'
  }

  return isAuthoritativeFreeSlot(findExactBookingIntentSlot(intent, scheduleDay))
    ? 'READY_TO_BOOK'
    : 'CONFLICT'
}

export interface BookingIntentAlternative {
  courtId: number
  date: string
  startTime: string
  endTime: string
  slot: BookingSlot
  score: number
}

function minutesFromTime(value: string): number {
  const [hours, minutes] = getSlotWallTime(value).split(':').map(Number)

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return Number.MAX_SAFE_INTEGER
  }

  return hours * 60 + minutes
}

function scoreAlternative(
  intent: BookingIntentRecord,
  courtId: number,
  slot: BookingSlot,
): number {
  const requestedStart = minutesFromTime(intent.requested_start)
  const slotStart = minutesFromTime(slot.start_time)
  const distance = Math.abs(slotStart - requestedStart)
  const sameCourt = courtId === intent.court_id
  const sameTime =
    getSlotWallTime(slot.start_time) === getSlotWallTime(intent.requested_start)

  if (sameCourt) {
    return distance
  }

  if (sameTime) {
    return 10_000
  }

  return 20_000 + distance
}

export function rankBookingIntentAlternatives(
  intent: BookingIntentRecord,
  scheduleDays: ScheduleDayRecord[],
): BookingIntentAlternative[] {
  return scheduleDays
    .filter((day) => day.date === intent.requested_date)
    .flatMap((day) =>
      day.slots
        .filter((slot) => isAuthoritativeFreeSlot(slot))
        .map((slot) => ({
          courtId: day.court_id,
          date: day.date,
          startTime: getSlotWallTime(slot.start_time),
          endTime: getSlotWallTime(slot.end_time),
          slot,
          score: scoreAlternative(intent, day.court_id, slot),
        })),
    )
    .sort((first, second) => {
      const scoreDifference = first.score - second.score

      if (scoreDifference !== 0) {
        return scoreDifference
      }

      return minutesFromTime(first.startTime) - minutesFromTime(second.startTime)
    })
}

interface BookingIntentRecheckRepositories {
  getBookingIntentsForCourts: (
    scope: OfflineScope,
    courtIds: number[],
  ) => Promise<BookingIntentRecord[]>
  readScheduleDay: (
    scope: OfflineScope,
    courtId: number,
    date: string,
  ) => Promise<ScheduleDayRecord | undefined>
  updateBookingIntent: (
    scope: OfflineScope,
    localId: string,
    updates: BookingIntentUpdate,
  ) => Promise<BookingIntentRecord | undefined>
}

export interface BookingIntentRecheckResult {
  checkedCount: number
  updatedCount: number
  skippedCount: number
}

export async function recheckBookingIntentsForScheduleCourts(options: {
  courtIds: number[]
  getNow?: () => Date
  repositories?: BookingIntentRecheckRepositories
  scope: OfflineScope
}): Promise<BookingIntentRecheckResult> {
  const repositories = options.repositories ?? offlineRepositories
  const now = options.getNow?.() ?? new Date()
  const checkedAt = now.toISOString()
  const intents = await repositories.getBookingIntentsForCourts(
    options.scope,
    options.courtIds,
  )
  const activeIntents = intents.filter((intent) =>
    RECHECKABLE_BOOKING_INTENT_STATUSES.includes(intent.status),
  )
  let checkedCount = 0
  let updatedCount = 0
  let skippedCount = 0

  for (const intent of activeIntents) {
    const scheduleDay = await repositories.readScheduleDay(
      options.scope,
      intent.court_id,
      intent.requested_date,
    )

    if (!scheduleDay) {
      skippedCount += 1
      continue
    }

    checkedCount += 1
    const nextStatus = classifyBookingIntentFromSchedule(intent, scheduleDay, now)

    if (
      nextStatus !== intent.status ||
      intent.last_checked_at !== checkedAt
    ) {
      await repositories.updateBookingIntent(options.scope, intent.local_id, {
        status: nextStatus,
        last_checked_at: checkedAt,
      })
      updatedCount += 1
    }
  }

  return {
    checkedCount,
    updatedCount,
    skippedCount,
  }
}
