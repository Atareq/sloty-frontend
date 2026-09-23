import { describe, expect, it } from 'vitest'
import {
  formatBookingDetailDateTimeRange,
  formatBookingDetailTime,
} from './bookingDetailTime.helpers'

describe('formatBookingDetailTime', () => {
  it.each([
    ['00:00', { value: '12:00 AM', clarification: 'منتصف الليل' }],
    ['12:00', { value: '12:00 PM', clarification: 'ظهرًا' }],
    ['00:30', { value: '12:30 AM', clarification: null }],
    ['12:30', { value: '12:30 PM', clarification: null }],
    ['18:00', { value: '06:00 PM', clarification: null }],
    ['23:00', { value: '11:00 PM', clarification: null }],
  ])('formats %s as a 12-hour booking-detail value', (time, expected) => {
    expect(formatBookingDetailTime(time)).toEqual(expected)
  })

  it('can suppress clarification for the range end while keeping its 12-hour value', () => {
    expect(
      formatBookingDetailTime('12:00', { includeClarification: false }),
    ).toEqual({ value: '12:00 PM', clarification: null })
  })
})

describe('formatBookingDetailDateTimeRange', () => {
  it('keeps backend instants in Egypt local time', () => {
    expect(
      formatBookingDetailDateTimeRange(
        '2026-07-21T00:00:00+03:00',
        '2026-07-21T12:00:00+03:00',
      ),
    ).toEqual({
      date: 'الثلاثاء، ٢١ يوليو',
      start: { value: '12:00 AM', clarification: 'منتصف الليل' },
      end: { value: '12:00 PM', clarification: null },
    })
  })

  it('uses the fallback calendar date for local time values', () => {
    expect(
      formatBookingDetailDateTimeRange('00:00', '12:00', '2026-07-21'),
    ).toEqual({
      date: 'الثلاثاء، ٢١ يوليو',
      start: { value: '12:00 AM', clarification: 'منتصف الليل' },
      end: { value: '12:00 PM', clarification: null },
    })
  })

  it('keeps already-local time-only values in the shared detail presentation', () => {
    expect(
      formatBookingDetailDateTimeRange('00:00', '01:00'),
    ).toEqual({
      date: '',
      start: { value: '12:00 AM', clarification: 'منتصف الليل' },
      end: { value: '01:00 AM', clarification: null },
    })
  })
})
