import { describe, expect, it } from 'vitest'
import {
  buildPublicCourtSchedulePath,
  buildPublicCourtScheduleUrl,
  getPublicScheduleDateWindow,
  isDateInsidePublicScheduleWindow,
  isValidGuestReturnRoute,
  mapPublicAvailabilityToScheduleSlots,
  PUBLIC_SCHEDULE_WINDOW_DAYS,
} from './publicSchedule.helpers'
import type { PublicCourtAvailabilityResponse } from './publicSchedule.types'

describe('publicSchedule.helpers', () => {
  describe('isValidGuestReturnRoute', () => {
    it('accepts canonical public court schedule paths', () => {
      expect(
        isValidGuestReturnRoute('/public/al-ahly/courts/12/schedule'),
      ).toBe(true)
      expect(
        isValidGuestReturnRoute('/public/club_123-abc/courts/1/schedule'),
      ).toBe(true)
    })

    it('rejects non-matching or arbitrary paths', () => {
      expect(isValidGuestReturnRoute('/schedule')).toBe(false)
      expect(isValidGuestReturnRoute('/dashboard')).toBe(false)
      expect(isValidGuestReturnRoute('/public/al-ahly/courts/schedule')).toBe(
        false,
      )
      expect(isValidGuestReturnRoute('/public/al-ahly/courts/abc/schedule')).toBe(
        false,
      )
      expect(
        isValidGuestReturnRoute('/public/al-ahly/courts/12/schedule/more'),
      ).toBe(false)
      expect(isValidGuestReturnRoute('https://evil.com')).toBe(false)
      expect(isValidGuestReturnRoute(null)).toBe(false)
      expect(isValidGuestReturnRoute(undefined)).toBe(false)
      expect(isValidGuestReturnRoute(123)).toBe(false)
    })
  })

  describe('getPublicScheduleDateWindow', () => {
    it('returns exactly 32 dates starting from yesterday and ending 30 days after today', () => {
      // 2026-06-15T12:00:00Z in Cairo is 2026-06-15
      const mockNow = new Date('2026-06-15T12:00:00Z')
      const window = getPublicScheduleDateWindow(mockNow)

      expect(window.dates).toHaveLength(PUBLIC_SCHEDULE_WINDOW_DAYS)
      expect(window.dates[0]).toBe('2026-06-14') // today - 1
      expect(window.dates[1]).toBe('2026-06-15') // today
      expect(window.dates[31]).toBe('2026-07-15') // today + 30
      expect(window.dateFrom).toBe('2026-06-14')
      expect(window.dateTo).toBe('2026-07-15')
    })
  })

  describe('isDateInsidePublicScheduleWindow', () => {
    const mockNow = new Date('2026-06-15T12:00:00Z')

    it('returns true for dates within [today - 1, today + 30]', () => {
      expect(isDateInsidePublicScheduleWindow('2026-06-14', mockNow)).toBe(true)
      expect(isDateInsidePublicScheduleWindow('2026-06-15', mockNow)).toBe(true)
      expect(isDateInsidePublicScheduleWindow('2026-07-01', mockNow)).toBe(true)
      expect(isDateInsidePublicScheduleWindow('2026-07-15', mockNow)).toBe(true)
    })

    it('returns false for dates outside the window', () => {
      expect(isDateInsidePublicScheduleWindow('2026-06-13', mockNow)).toBe(false)
      expect(isDateInsidePublicScheduleWindow('2026-07-16', mockNow)).toBe(false)
      expect(isDateInsidePublicScheduleWindow('2025-01-01', mockNow)).toBe(false)
    })
  })

  describe('mapPublicAvailabilityToScheduleSlots', () => {
    it('maps slots correctly with period and availability', () => {
      const mockResponse: PublicCourtAvailabilityResponse = {
        club: { id: 1, slug: 'al-ahly', name: 'Al Ahly' },
        court: { id: 5, name: 'Court 1' },
        date: '2026-06-15',
        is_closed: false,
        opens_at: '09:00',
        closes_at: '22:00',
        slot_duration_minutes: 60,
        slots: [
          {
            start_time: '09:00:00',
            end_time: '10:00:00',
            availability: 'AVAILABLE',
          },
          {
            start_time: '14:00',
            end_time: '15:00',
            availability: 'UNAVAILABLE',
          },
        ],
      }

      const mapped = mapPublicAvailabilityToScheduleSlots(mockResponse)

      expect(mapped).toHaveLength(2)
      expect(mapped[0]).toEqual({
        id: 'public-slot-2026-06-15-0900-1000',
        startTime: '09:00',
        endTime: '10:00',
        isAvailable: true,
        period: 'am',
        raw: mockResponse.slots[0],
      })
      expect(mapped[1]).toEqual({
        id: 'public-slot-2026-06-15-1400-1500',
        startTime: '14:00',
        endTime: '15:00',
        isAvailable: false,
        period: 'pm',
        raw: mockResponse.slots[1],
      })
    })
  })

  describe('buildPublicCourtSchedulePath and buildPublicCourtScheduleUrl', () => {
    it('builds canonical relative path for a court schedule', () => {
      expect(buildPublicCourtSchedulePath('al-ahly', 5)).toBe(
        '/public/al-ahly/courts/5/schedule',
      )
      expect(buildPublicCourtSchedulePath('club-test', '12')).toBe(
        '/public/club-test/courts/12/schedule',
      )
    })

    it('builds absolute URL with provided or window origin', () => {
      expect(
        buildPublicCourtScheduleUrl('al-ahly', 5, 'https://sloty.app'),
      ).toBe('https://sloty.app/public/al-ahly/courts/5/schedule')
    })
  })
})
