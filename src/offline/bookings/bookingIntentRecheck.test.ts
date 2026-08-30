import { describe, expect, it, vi } from 'vitest'
import type { BookingSlot } from '../../features/schedule/scheduleApi.types'
import type { BookingIntentRecord, ScheduleDayRecord } from '../offline.types'
import type { OfflineScope } from '../offline.types'
import {
  classifyBookingIntentFromSchedule,
  findExactBookingIntentSlot,
  getBookingIntentStatusLabel,
  rankBookingIntentAlternatives,
  recheckBookingIntentsForScheduleCourts,
} from './bookingIntentRecheck'

const scope: OfflineScope = { userId: 1, clubSlug: 'nasr-club' }

function slot(
  startTime: string,
  overrides: Partial<BookingSlot> = {},
): BookingSlot {
  return {
    date: '2026-08-30',
    start_time: `2026-08-30T${startTime}:00+03:00`,
    end_time: `2026-08-30T${String(Number(startTime.slice(0, 2)) + 1).padStart(
      2,
      '0',
    )}${startTime.slice(2)}:00+03:00`,
    slot_status: 'FREE',
    is_available: true,
    slot_price: '250.00',
    booking: null,
    recurring_anchor_booking_id: null,
    recurring_context: null,
    can_start_recurring: true,
    recurring_blocked_reason: null,
    first_recurring_conflict_start: null,
    label: 'متاح',
    ...overrides,
  }
}

function intent(
  overrides: Partial<BookingIntentRecord> = {},
): BookingIntentRecord {
  const originalSlot = slot('18:00')

  return {
    scope_key: 'user:1:club:nasr-club',
    user_id: 1,
    club_slug: 'nasr-club',
    local_id: 'intent-1',
    court_id: 7,
    requested_date: '2026-08-30',
    requested_start: '2026-08-30T18:00:00+03:00',
    requested_end: '2026-08-30T19:00:00+03:00',
    customer_name: 'أحمد علي',
    customer_phone: '+201012345678',
    notes: 'ملاحظة',
    original_slot_snapshot: originalSlot,
    status: 'PENDING_RECHECK',
    created_at: '2026-08-30T12:00:00.000Z',
    last_checked_at: null,
    resolved_booking_id: null,
    ...overrides,
  }
}

function scheduleDay(
  courtId: number,
  slots: BookingSlot[],
): ScheduleDayRecord {
  return {
    scope_key: 'user:1:club:nasr-club',
    user_id: 1,
    club_slug: 'nasr-club',
    court_id: courtId,
    date: '2026-08-30',
    message: null,
    slots,
    synced_at: '2026-08-30T12:01:00.000Z',
  }
}

describe('bookingIntentRecheck', () => {
  it('uses locked Arabic copy for persisted internal states', () => {
    expect(getBookingIntentStatusLabel('PENDING_RECHECK')).toBe(
      'بانتظار التأكيد',
    )
    expect(getBookingIntentStatusLabel('READY_TO_BOOK')).toBe('المعاد متاح')
    expect(getBookingIntentStatusLabel('CONFLICT')).toBe(
      'المعاد مبقاش متاح',
    )
    expect(getBookingIntentStatusLabel('BOOKED')).toBe('تم الحجز')
    expect(getBookingIntentStatusLabel('DISMISSED')).toBe('تم تجاهل الطلب')
    expect(getBookingIntentStatusLabel('EXPIRED')).toBe('انتهى الطلب')
  })

  it('finds a slot by Court/date/start/end rather than array index', () => {
    const exactSlot = slot('18:00')

    expect(
      findExactBookingIntentSlot(
        intent(),
        scheduleDay(7, [slot('17:00'), exactSlot]),
      ),
    ).toBe(exactSlot)
  })

  it('classifies fresh backend FREE slots as READY_TO_BOOK', () => {
    expect(
      classifyBookingIntentFromSchedule(
        intent(),
        scheduleDay(7, [slot('18:00')]),
        new Date('2026-08-30T12:00:00+03:00'),
      ),
    ).toBe('READY_TO_BOOK')
  })

  it('classifies occupied or missing fresh slots as CONFLICT', () => {
    expect(
      classifyBookingIntentFromSchedule(
        intent(),
        scheduleDay(7, [
          slot('18:00', {
            slot_status: 'CONFIRMED',
            is_available: false,
          }),
        ]),
        new Date('2026-08-30T12:00:00+03:00'),
      ),
    ).toBe('CONFLICT')

    expect(
      classifyBookingIntentFromSchedule(
        intent(),
        scheduleDay(7, [slot('20:00')]),
        new Date('2026-08-30T12:00:00+03:00'),
      ),
    ).toBe('CONFLICT')
  })

  it('classifies passed appointment times as EXPIRED using Egypt-local time', () => {
    expect(
      classifyBookingIntentFromSchedule(
        intent(),
        scheduleDay(7, [slot('18:00')]),
        new Date('2026-08-30T19:01:00+03:00'),
      ),
    ).toBe('EXPIRED')
  })

  it('updates only intents with a fresh relevant Schedule day', async () => {
    const updateBookingIntent = vi.fn().mockResolvedValue(undefined)
    const repositories = {
      getBookingIntentsForCourts: vi.fn().mockResolvedValue([
        intent(),
        intent({
          local_id: 'intent-2',
          court_id: 8,
          status: 'PENDING_RECHECK',
        }),
        intent({
          local_id: 'intent-3',
          status: 'DISMISSED',
        }),
      ]),
      readScheduleDay: vi.fn(async (_scope: OfflineScope, courtId: number) =>
        courtId === 7 ? scheduleDay(7, [slot('18:00')]) : undefined,
      ),
      updateBookingIntent,
    }

    const result = await recheckBookingIntentsForScheduleCourts({
      courtIds: [7, 8],
      getNow: () => new Date('2026-08-30T12:00:00+03:00'),
      repositories,
      scope,
    })

    expect(result).toEqual({
      checkedCount: 1,
      updatedCount: 1,
      skippedCount: 1,
    })
    expect(updateBookingIntent).toHaveBeenCalledWith(scope, 'intent-1', {
      status: 'READY_TO_BOOK',
      last_checked_at: '2026-08-30T09:00:00.000Z',
    })
    expect(updateBookingIntent).not.toHaveBeenCalledWith(
      scope,
      'intent-2',
      expect.anything(),
    )
  })

  it('ranks backend-provided FREE alternatives without generating slots', () => {
    const alternatives = rankBookingIntentAlternatives(intent(), [
      scheduleDay(7, [slot('20:00'), slot('17:00')]),
      scheduleDay(8, [slot('18:00')]),
      scheduleDay(9, [
        slot('18:00', {
          slot_status: 'CONFIRMED',
          is_available: false,
        }),
      ]),
    ])

    expect(
      alternatives.map(({ courtId, startTime }) => [courtId, startTime]),
    ).toEqual([
      [7, '17:00'],
      [7, '20:00'],
      [8, '18:00'],
    ])
  })
})
