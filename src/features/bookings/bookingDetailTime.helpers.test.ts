import { describe, expect, it } from 'vitest'
import {
  formatBookingDetailDateTimeRange,
  formatBookingDetailTime,
} from './bookingDetailTime.helpers'

describe('formatBookingDetailTime', () => {
  it.each([
    ['00:00', { value: '00:00', clarification: '(منتصف الليل)' }],
    ['12:00', { value: '12:00', clarification: '(ظهرًا)' }],
    ['00:30', { value: '00:30', clarification: null }],
    ['12:30', { value: '12:30', clarification: null }],
    ['18:00', { value: '18:00', clarification: null }],
    ['23:00', { value: '23:00', clarification: null }],
  ])('formats %s without changing normal times', (time, expected) => {
    expect(formatBookingDetailTime(time)).toEqual(expected)
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
      start: { value: '00:00', clarification: '(منتصف الليل)' },
      end: { value: '12:00', clarification: '(ظهرًا)' },
    })
  })

  it('uses the fallback calendar date for local time values', () => {
    expect(
      formatBookingDetailDateTimeRange('00:00', '12:00', '2026-07-21'),
    ).toEqual({
      date: 'الثلاثاء، ٢١ يوليو',
      start: { value: '00:00', clarification: '(منتصف الليل)' },
      end: { value: '12:00', clarification: '(ظهرًا)' },
    })
  })
})
