import { describe, expect, it, vi } from 'vitest'
import type { CurrentUserMembership } from '../../core/auth/auth.types'
import type { Booking } from '../../features/bookings/bookings.types'
import { createOfflineScopeKey } from '../scope/offlineScope'
import { createBookingSyncTask } from './bookingSyncTask'

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

function createContext(membership = managerMembership) {
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

function createBooking(id: number): Booking {
  return {
    id,
    court: 7,
    customer_name: `عميل ${id}`,
    customer_phone: `+2010000000${id}`,
    start_time: `2026-08-${String(24 + id).padStart(2, '0')}T18:00:00+03:00`,
    end_time: `2026-08-${String(24 + id).padStart(2, '0')}T19:00:00+03:00`,
    status: 'CONFIRMED',
    is_recurring: false,
    recurrence_status: null,
    previous_recurring_booking_id: null,
    next_recurring_booking_id: null,
  }
}

describe('createBookingSyncTask', () => {
  it('requests the previous 7 calendar days for the current selected Club scope', async () => {
    const committed: Booking[][] = []
    const listBookings = vi.fn(async () => ({
      count: 1,
      next: null,
      previous: null,
      results: [createBooking(1)],
    }))
    const task = createBookingSyncTask({
      getNow: () => new Date('2026-08-30T09:00:00+03:00'),
      listBookings,
      repositories: {
        replaceBookingsSnapshot: async (_scope, bookings) => {
          committed.push(bookings)
        },
      },
    })

    const result = await task.run({
      operationalContext: createContext(),
      trigger: 'startup',
      signal: new AbortController().signal,
      startedAt: '2026-08-30T06:00:00.000Z',
    })

    expect(listBookings).toHaveBeenCalledWith(
      'nasr-club',
      {
        date_from: '2026-08-24',
        date_to: '2026-08-30',
      },
      { signal: expect.any(AbortSignal) },
    )
    expect(committed[0]).toHaveLength(1)
    expect(result).toMatchObject({
      dataset: 'bookings',
      status: 'success',
      committedAt: '2026-08-30T06:00:00.000Z',
    })
  })

  it('keeps Staff synchronization limited to the assigned Court from verified scope', async () => {
    const listBookings = vi.fn(async () => ({
      count: 0,
      next: null,
      previous: null,
      results: [],
    }))
    const task = createBookingSyncTask({
      getNow: () => new Date('2026-08-30T09:00:00+03:00'),
      listBookings,
      repositories: {
        replaceBookingsSnapshot: vi.fn(async () => undefined),
      },
    })

    await task.run({
      operationalContext: createContext(staffMembership),
      trigger: 'manual',
      signal: new AbortController().signal,
      startedAt: '2026-08-30T06:00:00.000Z',
    })

    expect(listBookings).toHaveBeenCalledWith(
      'nasr-club',
      {
        court: 7,
        date_from: '2026-08-24',
        date_to: '2026-08-30',
      },
      { signal: expect.any(AbortSignal) },
    )
  })

  it('assembles all paginated pages before one atomic snapshot commit', async () => {
    const committed: Booking[][] = []
    const listBookings = vi
      .fn()
      .mockResolvedValueOnce({
        count: 3,
        next: '/bookings?page=2',
        previous: null,
        results: [createBooking(1)],
      })
      .mockResolvedValueOnce({
        count: 3,
        next: '/bookings?page=3',
        previous: '/bookings',
        results: [createBooking(2)],
      })
      .mockResolvedValueOnce({
        count: 3,
        next: null,
        previous: '/bookings?page=2',
        results: [createBooking(3)],
      })
    const task = createBookingSyncTask({
      getNow: () => new Date('2026-08-30T09:00:00+03:00'),
      listBookings,
      repositories: {
        replaceBookingsSnapshot: async (_scope, bookings) => {
          committed.push(bookings)
        },
      },
    })

    await task.run({
      operationalContext: createContext(),
      trigger: 'startup',
      signal: new AbortController().signal,
      startedAt: '2026-08-30T06:00:00.000Z',
    })

    expect(listBookings).toHaveBeenNthCalledWith(
      1,
      'nasr-club',
      { date_from: '2026-08-24', date_to: '2026-08-30' },
      { signal: expect.any(AbortSignal) },
    )
    expect(listBookings).toHaveBeenNthCalledWith(
      2,
      'nasr-club',
      { date_from: '2026-08-24', date_to: '2026-08-30', page: '2' },
      { signal: expect.any(AbortSignal) },
    )
    expect(listBookings).toHaveBeenNthCalledWith(
      3,
      'nasr-club',
      { date_from: '2026-08-24', date_to: '2026-08-30', page: '3' },
      { signal: expect.any(AbortSignal) },
    )
    expect(committed).toHaveLength(1)
    expect(committed[0].map((booking) => booking.id)).toEqual([1, 2, 3])
  })

  it('does not commit partial pages when a later page fails', async () => {
    const replaceBookingsSnapshot = vi.fn(async () => undefined)
    const listBookings = vi
      .fn()
      .mockResolvedValueOnce({
        count: 3,
        next: '/bookings?page=2',
        previous: null,
        results: [createBooking(1)],
      })
      .mockResolvedValueOnce({
        count: 3,
        next: '/bookings?page=3',
        previous: '/bookings',
        results: [createBooking(2)],
      })
      .mockRejectedValueOnce(new Error('page 3 failed'))
    const task = createBookingSyncTask({
      getNow: () => new Date('2026-08-30T09:00:00+03:00'),
      listBookings,
      repositories: { replaceBookingsSnapshot },
    })

    await expect(
      task.run({
        operationalContext: createContext(),
        trigger: 'startup',
        signal: new AbortController().signal,
        startedAt: '2026-08-30T06:00:00.000Z',
      }),
    ).rejects.toThrow('page 3 failed')

    expect(replaceBookingsSnapshot).not.toHaveBeenCalled()
  })
})
