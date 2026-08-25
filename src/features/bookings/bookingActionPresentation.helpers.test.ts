import { describe, expect, it } from 'vitest'
import type { BookingListItem } from '../schedule/scheduleApi.types'
import {
  getBookingActionPresentation,
  type BookingActionCapabilities,
} from './bookingActionPresentation.helpers'

const allCapabilities: BookingActionCapabilities = {
  canAddPayment: true,
  canCancel: true,
  canComplete: true,
  canFreeHold: true,
  canNoShow: true,
}

const now = new Date('2026-08-25T20:00:00Z')
const baseBooking: BookingListItem = {
  id: 1,
  court: 2,
  customer_name: 'أحمد محمد',
  start_time: '2026-08-25T18:00:00Z',
  end_time: '2026-08-25T19:00:00Z',
  status: 'CONFIRMED',
  paid_amount: '300.00',
  remaining_amount: '0.00',
  is_recurring: false,
  recurrence_status: null,
  previous_recurring_booking_id: null,
  next_recurring_booking_id: null,
}

describe('getBookingActionPresentation', () => {
  it('makes the HOLD deposit the primary action', () => {
    const result = getBookingActionPresentation(
      { ...baseBooking, status: 'HOLD', remaining_amount: '300.00' },
      allCapabilities,
      now,
    )

    expect(result.stateMessage).toBe('بانتظار العربون')
    expect(result.primaryAction).toEqual({
      type: 'PAYMENT',
      label: 'ضيف العربون وأكد الحجز',
    })
    expect(result.primaryAction?.label).not.toBe('إضافة دفعة')
  })

  it('prioritizes collecting a positive balance over completion', () => {
    const result = getBookingActionPresentation(
      { ...baseBooking, remaining_amount: '150.00' },
      allCapabilities,
      now,
    )

    expect(result.stateMessage).toBe('الحجز خلص ولسه عليه 150.00 ج.م')
    expect(result.primaryAction).toEqual({
      type: 'PAYMENT',
      label: 'حصّل 150.00 ج.م',
    })
  })

  it('does not offer payment for an active fully-paid booking', () => {
    const result = getBookingActionPresentation(
      {
        ...baseBooking,
        start_time: '2026-08-26T18:00:00Z',
        end_time: '2026-08-26T19:00:00Z',
      },
      allCapabilities,
      now,
    )

    expect(result.stateMessage).toBe('مؤكد')
    expect(result.primaryAction).toBeNull()
  })

  it('offers completion for an ended fully-paid booking', () => {
    const result = getBookingActionPresentation(
      baseBooking,
      allCapabilities,
      now,
    )

    expect(result.stateMessage).toBe('الحجز خلص ولسه مقفلتوش')
    expect(result.primaryAction).toEqual({ type: 'COMPLETE', label: 'إكمال' })
    expect(result.secondaryActions).toContain('NO_SHOW')
  })

  it.each(['COMPLETED', 'CANCELLED', 'EXPIRED', 'NO_SHOW'] as const)(
    'keeps %s read-only',
    (status) => {
      const result = getBookingActionPresentation(
        { ...baseBooking, status },
        allCapabilities,
        now,
      )

      expect(result.primaryAction).toBeNull()
      expect(result.secondaryActions).toEqual([])
    },
  )

  it('only exposes cancellation when the implemented callback and lifecycle allow it', () => {
    expect(
      getBookingActionPresentation(baseBooking, allCapabilities, now)
        .secondaryActions,
    ).toContain('CANCEL')
    expect(
      getBookingActionPresentation(
        baseBooking,
        { ...allCapabilities, canCancel: false },
        now,
      ).secondaryActions,
    ).not.toContain('CANCEL')
  })

  it('keeps cancellation available because Backend ends active recurrence', () => {
    const result = getBookingActionPresentation(
      { ...baseBooking, is_recurring: true, recurrence_status: 'ACTIVE' },
      allCapabilities,
      now,
    )

    expect(result.secondaryActions).toContain('CANCEL')
    expect(result.secondaryActions).toContain('NO_SHOW')
  })
})
