import { describe, expect, it, vi } from 'vitest'
import { apiRequest } from '../../core/api/apiClient'
import { apiEndpoints } from '../../shared/api/apiEndpoints'
import {
  buildBookingSlotsPath,
  buildBookingListPath,
  cancelBooking,
  completeBooking,
  createBooking,
  endBookingRecurrence,
  getBooking,
  getBookingRecurrenceNext,
  listBookingSlots,
  listBookingsForCourtDay,
  markBookingNoShow,
  previewBookingCancellation,
  rescheduleBooking,
  updateBooking,
} from './scheduleApi'
import {
  BACKEND_BOOKING_STATUSES,
  BOOKING_COMPLETION_REQUIRES_FULL_PAYMENT,
  BOOKING_SLOT_STATUSES,
} from './scheduleApi.types'

vi.mock('../../core/api/apiClient', () => ({
  apiRequest: vi.fn(),
}))

const mockedApiRequest = vi.mocked(apiRequest)

describe('scheduleApi', () => {
  it('builds booking list path with court and date filters', () => {
    expect(
      buildBookingListPath('nasr-club', { court: 3, date: '2026-07-02' }),
    ).toBe('clubs/nasr-club/bookings/?court=3&date=2026-07-02')
  })

  it('uses the shared booking endpoint registry for day/court requests', async () => {
    mockedApiRequest.mockResolvedValueOnce({
      count: 0,
      next: null,
      previous: null,
      results: [],
    })

    await listBookingsForCourtDay('nasr-club', {
      court: 3,
      date: '2026-07-02',
    })

    expect(mockedApiRequest).toHaveBeenCalledWith(
      `${apiEndpoints.clubs.bookings.list('nasr-club')}?court=3&date=2026-07-02`,
    )
  })

  it('builds booking slots paths extending single day start date by one calendar day', () => {
    expect(
      buildBookingSlotsPath('nasr-club', { court: 3, date: '2026-09-17' }),
    ).toBe(
      'clubs/nasr-club/bookings/slots/?court=3&date_from=2026-09-16&date_to=2026-09-17',
    )
  })

  it('builds booking slots paths across month boundary', () => {
    expect(
      buildBookingSlotsPath('nasr-club', { court: 3, date: '2026-10-01' }),
    ).toBe(
      'clubs/nasr-club/bookings/slots/?court=3&date_from=2026-09-30&date_to=2026-10-01',
    )
  })

  it('builds booking slots paths across year boundary', () => {
    expect(
      buildBookingSlotsPath('nasr-club', { court: 3, date: '2027-01-01' }),
    ).toBe(
      'clubs/nasr-club/bookings/slots/?court=3&date_from=2026-12-31&date_to=2027-01-01',
    )
  })

  it('builds booking slots paths for a date range extending date_from by one calendar day', () => {
    expect(
      buildBookingSlotsPath('nasr-club', {
        court: 3,
        date_from: '2026-07-02',
        date_to: '2026-07-09',
      }),
    ).toBe(
      'clubs/nasr-club/bookings/slots/?court=3&date_from=2026-07-01&date_to=2026-07-09',
    )
  })

  it('lists booking slots through the slots endpoint with extended start date', async () => {
    mockedApiRequest.mockResolvedValueOnce({
      court: 3,
      court_name: 'Court 1',
      date_from: '2026-09-16',
      date_to: '2026-09-17',
      slot_duration_minutes: 60,
      message: null,
      slots: [],
    })

    await listBookingSlots('nasr-club', {
      court: 3,
      date: '2026-09-17',
    })

    expect(mockedApiRequest).toHaveBeenCalledWith(
      `${apiEndpoints.clubs.bookings.slots('nasr-club')}?court=3&date_from=2026-09-16&date_to=2026-09-17`,
    )
  })

  it('keeps FREE as a slot-only response status', () => {
    expect(BOOKING_SLOT_STATUSES).toContain('FREE')
    expect(BOOKING_SLOT_STATUSES).toContain('UNAVAILABLE')
    expect(BOOKING_SLOT_STATUSES).toContain('RECURRING_RESERVED')
    expect(BOOKING_SLOT_STATUSES).toContain('CANCELLED')
    expect(BOOKING_SLOT_STATUSES).toContain('EXPIRED')
    expect(BACKEND_BOOKING_STATUSES).not.toContain('FREE')
    expect(BACKEND_BOOKING_STATUSES).not.toContain('UNAVAILABLE')
  })

  it('exports the full-payment completion error code', () => {
    expect(BOOKING_COMPLETION_REQUIRES_FULL_PAYMENT).toBe(
      'BOOKING_COMPLETION_REQUIRES_FULL_PAYMENT',
    )
  })

  it('creates bookings through the shared booking list endpoint with POST', async () => {
    const payload = {
      court: 3,
      customer_name: 'أحمد علي',
      customer_phone: '01000000000',
      start_time: '2026-07-02T18:00:00+03:00',
      end_time: '2026-07-02T19:00:00+03:00',
      source: 'MANUAL',
      is_recurring: true,
      client_request_id: '11111111-2222-3333-4444-555555555555',
      requested_at: '2026-07-02T10:00:00.000Z',
    }

    mockedApiRequest.mockResolvedValueOnce({
      id: 20,
      court: 3,
      customer_name: 'أحمد علي',
      customer_phone: '01000000000',
      start_time: '2026-07-02T18:00:00+03:00',
      end_time: '2026-07-02T19:00:00+03:00',
      status: 'CONFIRMED',
    })

    await createBooking('nasr-club', payload)

    expect(mockedApiRequest).toHaveBeenCalledWith(
      apiEndpoints.clubs.bookings.list('nasr-club'),
      {
        method: 'POST',
        body: payload,
      },
    )
    expect(payload.start_time).toMatch(/[+-]\d{2}:\d{2}$/)
    expect(payload.end_time).toMatch(/[+-]\d{2}:\d{2}$/)
    expect(payload).not.toHaveProperty('club_player_id')
    expect(payload).not.toHaveProperty('player_profile_id')
  })

  it('posts historical start_time values without local date eligibility checks', async () => {
    const payload = {
      court: 3,
      customer_name: 'أحمد علي',
      customer_phone: '01000000000',
      start_time: '2020-01-01T08:00:00+02:00',
      end_time: '2020-01-01T09:00:00+02:00',
      source: 'MANUAL' as const,
      is_recurring: false,
      client_request_id: '11111111-2222-3333-4444-555555555555',
      requested_at: '2026-07-20T10:00:00.000Z',
    }

    mockedApiRequest.mockResolvedValueOnce({
      id: 21,
      court: 3,
      customer_name: 'أحمد علي',
      start_time: payload.start_time,
      end_time: payload.end_time,
      status: 'HOLD',
    })

    await createBooking('nasr-club', payload)

    expect(mockedApiRequest).toHaveBeenCalledWith(
      apiEndpoints.clubs.bookings.list('nasr-club'),
      {
        method: 'POST',
        body: payload,
      },
    )
  })

  it('loads canonical booking detail through the booking endpoint', async () => {
    mockedApiRequest.mockResolvedValueOnce({ id: 20 })

    await getBooking('nasr-club', 20)

    expect(mockedApiRequest).toHaveBeenCalledWith(
      apiEndpoints.clubs.bookings.detail('nasr-club', 20),
    )
  })

  it('cancels bookings through the shared cancel endpoint with POST', async () => {
    const payload = {
      reason: 'العميل ألغى',
      notes: 'اتصل قبل الموعد',
    }

    mockedApiRequest.mockResolvedValueOnce({
      id: 20,
      court: 3,
      start_time: '2026-07-02T18:00:00',
      end_time: '2026-07-02T19:00:00',
      status: 'CANCELLED',
    })

    await cancelBooking('nasr-club', 20, payload)

    expect(mockedApiRequest).toHaveBeenCalledWith(
      apiEndpoints.clubs.bookings.cancel('nasr-club', 20),
      {
        method: 'POST',
        body: payload,
      },
    )
  })

  it('loads booking cancellation previews through the shared endpoint with POST', async () => {
    mockedApiRequest.mockResolvedValueOnce({
      booking_id: 20,
      previewed_at: '2026-07-01T12:00:00Z',
      booking_start: '2026-07-02T18:00:00Z',
      paid_amount: '300.00',
      minimum_deposit: '100.00',
      refund_notice_days: 3,
      refund_deadline: '2026-06-29T18:00:00Z',
      full_refund: false,
      refund_amount: '200.00',
      retained_amount: '100.00',
      can_cancel: true,
    })

    await previewBookingCancellation('nasr-club', 20)

    expect(mockedApiRequest).toHaveBeenCalledWith(
      apiEndpoints.clubs.bookings.cancellationPreview('nasr-club', 20),
      {
        method: 'POST',
      },
    )
  })

  it('completes bookings through the shared complete endpoint with POST', async () => {
    mockedApiRequest.mockResolvedValueOnce({
      id: 20,
      court: 3,
      start_time: '2026-07-02T18:00:00',
      end_time: '2026-07-02T19:00:00',
      status: 'COMPLETED',
    })

    await completeBooking('nasr-club', 20)

    expect(mockedApiRequest).toHaveBeenCalledWith(
      apiEndpoints.clubs.bookings.complete('nasr-club', 20),
      {
        method: 'POST',
      },
    )
  })

  it('sends recurrence continuation fields without a client-calculated amount', async () => {
    mockedApiRequest.mockResolvedValueOnce({ id: 20 })

    await completeBooking('nasr-club', 20, {
      continue_recurring: true,
      next_deposit_payment_method: 'CASH',
      next_deposit_payment_reference: 'NEXT-1',
      next_deposit_notes: 'العربون القادم',
    })

    expect(mockedApiRequest).toHaveBeenCalledWith(
      apiEndpoints.clubs.bookings.complete('nasr-club', 20),
      {
        method: 'POST',
        body: {
          continue_recurring: true,
          next_deposit_payment_method: 'CASH',
          next_deposit_payment_reference: 'NEXT-1',
          next_deposit_notes: 'العربون القادم',
        },
      },
    )
    expect(mockedApiRequest.mock.calls.at(-1)?.[1]?.body)
      .not.toHaveProperty('next_deposit_amount')
  })

  it('ends recurrence through the booking endpoint', async () => {
    mockedApiRequest.mockResolvedValueOnce({ id: 20 })

    await endBookingRecurrence('nasr-club', 20, { reason: 'طلب العميل' })

    expect(mockedApiRequest).toHaveBeenCalledWith(
      apiEndpoints.clubs.bookings.endRecurrence('nasr-club', 20),
      {
        method: 'POST',
        body: { reason: 'طلب العميل' },
      },
    )
  })

  it('loads recurrence-next through the booking endpoint', async () => {
    mockedApiRequest.mockResolvedValueOnce({
      can_continue: true,
      next_start_time: '2026-09-15T20:00:00+03:00',
      next_end_time: '2026-09-15T21:00:00+03:00',
      next_total_price: '350.00',
      next_required_deposit: '150.00',
      requires_digital_payment_reference: false,
    })

    await getBookingRecurrenceNext('nasr-club', 20)

    expect(mockedApiRequest).toHaveBeenCalledWith(
      apiEndpoints.clubs.bookings.recurrenceNext('nasr-club', 20),
    )
  })

  it('patches customer identity and notes without player IDs', async () => {
    mockedApiRequest.mockResolvedValueOnce({
      id: 20,
      customer_name: 'Ahmed Hassan',
      customer_phone: '+201000000002',
      notes: 'Updated note',
    })

    await updateBooking('nasr-club', 20, {
      customer_name: 'Ahmed Hassan',
      customer_phone: '+201000000002',
      notes: 'Updated note',
    })

    expect(mockedApiRequest).toHaveBeenCalledWith(
      apiEndpoints.clubs.bookings.detail('nasr-club', 20),
      {
        method: 'PATCH',
        body: {
          customer_name: 'Ahmed Hassan',
          customer_phone: '+201000000002',
          notes: 'Updated note',
        },
      },
    )
    const patchBody = (mockedApiRequest.mock.calls.at(-1)?.[1] as { body?: Record<string, unknown> })?.body
    expect(patchBody).toEqual({
      customer_name: 'Ahmed Hassan',
      customer_phone: '+201000000002',
      notes: 'Updated note',
    })
    expect(patchBody).not.toHaveProperty('player_profile_id')
    expect(patchBody).not.toHaveProperty('club_player_id')
    expect(patchBody).not.toHaveProperty('court')
    expect(patchBody).not.toHaveProperty('start_time')
    expect(patchBody).not.toHaveProperty('end_time')
  })

  it('reschedules through the booking reschedule endpoint', async () => {
    mockedApiRequest.mockResolvedValueOnce({ id: 20 })

    await rescheduleBooking('nasr-club', 20, {
      court: 7,
      start_time: '2026-12-01T18:00:00+02:00',
      end_time: '2026-12-01T19:00:00+02:00',
      reason: 'طلب العميل',
    })

    expect(mockedApiRequest).toHaveBeenCalledWith(
      apiEndpoints.clubs.bookings.reschedule('nasr-club', 20),
      {
        method: 'POST',
        body: {
          court: 7,
          start_time: '2026-12-01T18:00:00+02:00',
          end_time: '2026-12-01T19:00:00+02:00',
          reason: 'طلب العميل',
        },
      },
    )
  })

  it('marks bookings as no-show through the shared no-show endpoint with POST', async () => {
    const payload = {
      reason: 'لم يحضر العميل',
      notes: 'لم يرد على الهاتف',
    }

    mockedApiRequest.mockResolvedValueOnce({
      id: 20,
      court: 3,
      start_time: '2026-07-02T18:00:00',
      end_time: '2026-07-02T19:00:00',
      status: 'NO_SHOW',
    })

    await markBookingNoShow('nasr-club', 20, payload)

    expect(mockedApiRequest).toHaveBeenCalledWith(
      apiEndpoints.clubs.bookings.noShow('nasr-club', 20),
      {
        method: 'POST',
        body: payload,
      },
    )
  })
})
