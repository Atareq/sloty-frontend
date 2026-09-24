import { describe, expect, it } from 'vitest'
import { apiEndpoints } from './apiEndpoints'
import { extractResults, isPaginatedResponse } from './pagination.helpers'
import { ApiClientError } from '../../core/api/apiClient'
import {
  getApiErrorCode,
  getApiErrorMessage,
  getApiFieldErrors,
  getFirstFieldErrorMessage,
  isApiClientError,
} from '../../core/api/apiError.helpers'
import type { BookingCreatePayload, BookingUpdatePayload } from '../../features/schedule/scheduleApi.types'
import type { CourtPayload } from '../../features/courts/courts.types'

describe('Sloty Frontend API Contract Matrix Verification', () => {
  describe('1. Endpoint Inventory & Invented Route Protection', () => {
    it('verifies that removed invented endpoints do not exist on apiEndpoints', () => {
      const clubsAny = apiEndpoints.clubs as Record<string, unknown>
      const settlementsAny = apiEndpoints.clubs.settlements as Record<string, unknown>

      // 1. Settlements mark-settled is strictly removed (settlements are immutable once created)
      expect('markSettled' in settlementsAny).toBe(false)

      // 2. Club-level memberships list was never a backend endpoint (memberships come inside /me/)
      expect('memberships' in clubsAny).toBe(false)

      // 3. clubs/{slug}/users/ was replaced with confirmed clubs/{slug}/staff/
      expect('users' in clubsAny).toBe(false)
    })

    it('verifies confirmed staff endpoints build correct URL patterns', () => {
      expect(apiEndpoints.clubs.staff.list('al-ahly')).toBe('clubs/al-ahly/staff/')
      expect(apiEndpoints.clubs.staff.detail('al-ahly', 42)).toBe('clubs/al-ahly/staff/42/')
      expect(apiEndpoints.clubs.staff.courts('al-ahly', 42)).toBe('clubs/al-ahly/staff/42/courts/')
    })

    it('verifies confirmed settlements endpoints build correct URL patterns', () => {
      expect(apiEndpoints.clubs.settlements.list('padel-hub')).toBe('clubs/padel-hub/settlements/')
      expect(apiEndpoints.clubs.settlements.detail('padel-hub', 10)).toBe('clubs/padel-hub/settlements/10/')
      expect(apiEndpoints.clubs.settlements.preview('padel-hub')).toBe('clubs/padel-hub/settlements/preview/')
      expect(apiEndpoints.clubs.settlements.unsettledSummary('padel-hub')).toBe('clubs/padel-hub/settlements/unsettled-summary/')
    })

    it('verifies core operational and guest availability routes', () => {
      expect(apiEndpoints.clubs.bookings.list('club-x')).toBe('clubs/club-x/bookings/')
      expect(apiEndpoints.clubs.bookings.slots('club-x')).toBe('clubs/club-x/bookings/slots/')
      expect(apiEndpoints.public.courtAvailability('club-x', 5)).toBe('public/clubs/club-x/courts/5/availability/')
      expect(apiEndpoints.clubs.courts.list('club-x')).toBe('clubs/club-x/courts/')
      expect(apiEndpoints.clubs.courts.workingHours.detail('club-x', 5)).toBe('clubs/club-x/courts/5/working-hours/')
    })
  })

  describe('2. Payload Intent Contracts', () => {
    it('verifies BookingCreatePayload contains only client intent without backend financial/customer IDs', () => {
      const validPayload: BookingCreatePayload = {
        court: 1,
        customer_name: 'أحمد محمود',
        customer_phone: '01012345678',
        start_time: '2026-09-22T18:00:00Z',
        end_time: '2026-09-22T19:30:00Z',
        notes: 'ملاحظة تجريبية',
        is_recurring: false,
      }

      // Assert that backend-owned attributes are not part of user intent payload
      expect(validPayload).not.toHaveProperty('total_price')
      expect(validPayload).not.toHaveProperty('club_player_id')
      expect(validPayload).not.toHaveProperty('player_profile_id')
      expect(validPayload).not.toHaveProperty('customer_id')
      expect(validPayload).not.toHaveProperty('remaining_amount')
      expect(validPayload.customer_phone).toBe('01012345678')
    })

    it('verifies BookingUpdatePayload sends customer intent without identity IDs', () => {
      const validPayload: BookingUpdatePayload = {
        customer_name: 'Ahmed Hassan',
        customer_phone: '+201000000002',
        notes: 'Updated note',
      }

      expect(validPayload).toEqual({
        customer_name: 'Ahmed Hassan',
        customer_phone: '+201000000002',
        notes: 'Updated note',
      })
      expect(validPayload).not.toHaveProperty('player_profile_id')
      expect(validPayload).not.toHaveProperty('club_player_id')
      expect(validPayload).not.toHaveProperty('court')
      expect(validPayload).not.toHaveProperty('start_time')
      expect(validPayload).not.toHaveProperty('end_time')
    })

    it('verifies CourtPayload does not include client-side pricing overrides', () => {
      const validCourtPayload: CourtPayload = {
        name: 'الملعب الرئيسي',
        sport_type: 'PADEL',
        minimum_deposit: '50.00',
        cancellation_refund_notice_days: 1,
        slot_duration_minutes: 60,
        is_active: true,
      }

      expect(validCourtPayload).not.toHaveProperty('default_price')
      expect(validCourtPayload).not.toHaveProperty('hourly_rate')
    })
  })

  describe('3. Pagination Envelope Contract', () => {
    it('recognizes DRF paginated response envelopes correctly', () => {
      const drfEnvelope = {
        count: 2,
        next: 'https://api.sloty.app/api/v1/clubs/?page=2',
        previous: null,
        results: [{ id: 1, name: 'Club 1' }, { id: 2, name: 'Club 2' }],
      }

      expect(isPaginatedResponse(drfEnvelope)).toBe(true)
      expect(extractResults(drfEnvelope)).toEqual(drfEnvelope.results)
    })

    it('handles non-paginated or plain array responses safely in extractResults', () => {
      const plainArray = [{ id: 1 }, { id: 2 }]
      expect(isPaginatedResponse(plainArray)).toBe(false)
      expect(extractResults(plainArray)).toEqual(plainArray)

      expect(extractResults(null)).toEqual([])
      expect(extractResults(undefined)).toEqual([])
    })
  })

  describe('4. Backend Error Contract Preservation', () => {
    it('preserves field-level validation errors from Django REST Framework', () => {
      const error = new ApiClientError('يرجى مراجعة البيانات المدخلة.', 400, {
        code: 'VALIDATION_ERROR',
        fieldErrors: {
          customer_phone: [
            { code: 'INVALID_PHONE', message: 'رقم الهاتف غير صالح.' },
          ],
          start_time: [
            { code: 'SLOT_CONFLICT', message: 'يوجد حجز آخر يتعارض مع هذا الوقت.' },
          ],
        },
      })

      expect(isApiClientError(error)).toBe(true)
      expect(error.status).toBe(400)
      expect(getApiErrorCode(error)).toBe('VALIDATION_ERROR')

      const fieldErrors = getApiFieldErrors(error)
      expect(fieldErrors).toBeDefined()
      expect(getFirstFieldErrorMessage(fieldErrors, 'customer_phone')).toBe('رقم الهاتف غير صالح.')
      expect(getFirstFieldErrorMessage(fieldErrors, 'start_time')).toBe('يوجد حجز آخر يتعارض مع هذا الوقت.')
    })

    it('preserves HTTP status code and detail messages', () => {
      const error = new ApiClientError('الحجز غير موجود أو تم حذفه.', 404, {
        code: 'NOT_FOUND',
      })

      expect(isApiClientError(error)).toBe(true)
      expect(error.status).toBe(404)
      expect(getApiErrorMessage(error)).toBe('الحجز غير موجود أو تم حذفه.')
      expect(getApiErrorCode(error)).toBe('NOT_FOUND')
    })
  })
})
