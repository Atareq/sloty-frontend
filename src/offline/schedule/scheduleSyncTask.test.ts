import { describe, expect, it, vi } from 'vitest'
import type { CurrentUserMembership } from '../../core/auth/auth.types'
import type { BookingSlot } from '../../features/schedule/scheduleApi.types'
import type { ScheduleDaySnapshot } from '../repositories/offlineRepositories'
import { createOfflineScopeKey } from '../scope/offlineScope'
import { setPreferredScheduleCourt } from './scheduleSyncPreference'
import { createScheduleSyncTask } from './scheduleSyncTask'

const staffMembership: CurrentUserMembership = {
  id: 10,
  role: 'STAFF',
  club: {
    id: 1,
    slug: 'nasr-club',
    name: 'نادي النصر',
    is_active: true,
  },
  court: { id: 7, name: 'ملعب 1' },
}

const managerMembership: CurrentUserMembership = {
  ...staffMembership,
  id: 11,
  role: 'MANAGER',
  court: null,
}

function createContext(membership = staffMembership) {
  const scope = { userId: 1, clubSlug: 'nasr-club' }

  return {
    ...scope,
    scopeKey: createOfflineScopeKey(scope),
    role: membership.role,
    membership,
    membershipId: membership.id,
    assignedCourtId: membership.court?.id ?? null,
    assignedCourtName: membership.court?.name ?? null,
  }
}

function makeSlot(overrides: Partial<BookingSlot> = {}): BookingSlot {
  return {
    date: '2026-08-30',
    start_time: '2026-08-30T18:00:00+03:00',
    end_time: '2026-08-30T19:00:00+03:00',
    slot_status: 'RECURRING_RESERVED',
    is_available: false,
    slot_price: '250.00',
    booking: null,
    recurring_anchor_booking_id: 50,
    recurring_context: {
      anchor_booking_id: 50,
      customer_name: 'عميل أسبوعي',
      customer_phone: '+201000000000',
      recurrence_status: 'ACTIVE',
    },
    can_start_recurring: false,
    recurring_blocked_reason: 'RECURRING_SLOT_RESERVED',
    first_recurring_conflict_start: '2026-09-06T18:00:00+03:00',
    label: 'محجوز أسبوعيًا',
    ...overrides,
  }
}

describe('createScheduleSyncTask', () => {
  it('syncs Staff assigned Court for today plus 30 days and preserves backend slot fields', async () => {
    const stored: ScheduleDaySnapshot[][] = []
    const listBookingSlots = vi.fn(async () => ({
      court: 7,
      court_name: 'ملعب 1',
      date_from: '2026-08-30',
      date_to: '2026-09-29',
      slot_duration_minutes: 60,
      message: null,
      slots: [makeSlot()],
    }))
    const task = createScheduleSyncTask({
      getNow: () => new Date('2026-08-30T09:00:00+03:00'),
      listBookingSlots,
      listCourts: vi.fn(),
      repositories: {
        replaceScheduleWindow: async (_scope, _courtId, days) => {
          stored.push(days)
        },
      },
    })

    const result = await task.run({
      operationalContext: createContext(),
      trigger: 'startup',
      signal: new AbortController().signal,
      startedAt: '2026-08-30T06:00:00.000Z',
    })

    expect(result.status).toBe('success')
    expect(listBookingSlots).toHaveBeenCalledWith(
      'nasr-club',
      {
        court: 7,
        date_from: '2026-08-30',
        date_to: '2026-09-29',
      },
      { signal: expect.any(AbortSignal) },
    )
    expect(stored[0]).toHaveLength(31)
    expect(stored[0][0].slots[0]).toMatchObject({
      slot_status: 'RECURRING_RESERVED',
      recurring_anchor_booking_id: 50,
      can_start_recurring: false,
      slot_price: '250.00',
    })
    expect(stored[0][1]).toMatchObject({
      date: '2026-08-31',
      slots: [],
    })
  })

  it('orders Manager authorized Courts by selected preference and keeps other Court failures independent', async () => {
    const context = createContext(managerMembership)
    const committedCourts: number[] = []
    const listBookingSlots = vi.fn(async (_clubSlug, params) => {
      if (params.court === 8) {
        throw new Error('court 8 failed')
      }

      return {
        court: params.court,
        court_name: `ملعب ${params.court}`,
        date_from: params.date_from,
        date_to: params.date_to,
        slot_duration_minutes: 60,
        message: null,
        slots: [makeSlot({ date: '2026-08-30' })],
      }
    })

    setPreferredScheduleCourt(context.scopeKey, 9)
    const task = createScheduleSyncTask({
      getNow: () => new Date('2026-08-30T09:00:00+03:00'),
      listBookingSlots,
      listCourts: vi.fn(async () => ({
        results: [
          { id: 7, club: 1, name: 'ملعب 7', sport_type: 'FOOTBALL', default_price: '250.00', minimum_deposit: '100.00', cancellation_refund_notice_days: 3, slot_duration_minutes: 60, is_active: true, requires_digital_payment_reference: false, internal_hold_expiry_hours: 12 },
          { id: 8, club: 1, name: 'ملعب 8', sport_type: 'FOOTBALL', default_price: '250.00', minimum_deposit: '100.00', cancellation_refund_notice_days: 3, slot_duration_minutes: 60, is_active: true, requires_digital_payment_reference: false, internal_hold_expiry_hours: 12 },
          { id: 9, club: 1, name: 'ملعب 9', sport_type: 'FOOTBALL', default_price: '250.00', minimum_deposit: '100.00', cancellation_refund_notice_days: 3, slot_duration_minutes: 60, is_active: true, requires_digital_payment_reference: false, internal_hold_expiry_hours: 12 },
        ],
      })),
      repositories: {
        replaceScheduleWindow: async (_scope, courtId) => {
          committedCourts.push(courtId)
        },
      },
    })

    const result = await task.run({
      operationalContext: context,
      trigger: 'manual',
      signal: new AbortController().signal,
      startedAt: '2026-08-30T06:00:00.000Z',
    })

    expect(listBookingSlots.mock.calls.map(([, params]) => params.court))
      .toEqual([9, 7, 8])
    expect(committedCourts).toEqual([9, 7])
    expect(result).toMatchObject({
      dataset: 'schedule',
      status: 'success',
      committedAt: '2026-08-30T06:00:00.000Z',
      reason: 'failed_courts:8',
    })
  })
})
