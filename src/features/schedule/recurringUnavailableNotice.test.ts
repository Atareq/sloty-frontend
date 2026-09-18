import { describe, expect, it } from 'vitest'
import { buildRecurringUnavailableNotice } from './recurringUnavailableNotice'

describe('buildRecurringUnavailableNotice', () => {
  it('explains the first future conflict when Backend provides a timestamp', () => {
    const notice = buildRecurringUnavailableNotice({
      conflict_type: 'FUTURE_CONFLICT',
      first_conflict_start: '2026-09-25T11:00:00+00:00',
      conflicting_booking_id: 5,
    })

    expect(notice.title).toBe('التثبيت الأسبوعي مش متاح')
    expect(notice.message).toMatch(/^فيه حجز متعارض يوم /)
    expect(notice.message).toContain('سبتمبر')
    expect(notice.message).not.toContain('5')
    expect(notice.message).not.toContain('conflicting_booking_id')
  })

  it('falls back when the conflict timestamp is missing', () => {
    expect(buildRecurringUnavailableNotice({ conflict_type: 'FUTURE_CONFLICT' })).toEqual({
      title: 'التثبيت الأسبوعي مش متاح',
      message: 'فيه حجز متعارض في أحد الأسابيع الجاية.',
    })
  })

  it('falls back when details are absent', () => {
    expect(buildRecurringUnavailableNotice(null)).toEqual({
      title: 'التثبيت الأسبوعي مش متاح',
      message: 'فيه حجز متعارض في أحد الأسابيع الجاية.',
    })
  })
})
