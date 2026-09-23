import { describe, expect, it } from 'vitest'
import type { BookingListItem } from '../../features/schedule/scheduleApi.types'
import type { Transaction } from '../../features/transactions/transactions.types'
import { getTransactionCancelState } from '../../features/transactions/transactionFilters.helpers'
import type { Settlement, SettlementPreview } from '../../features/settlements/settlements.types'
import { formatSettlementActor } from '../../features/settlements/settlementDisplay.helpers'
import type { AuditLogEntry } from '../../features/audit/audit.types'
import { getAuditEntryPresentation } from '../../features/audit/auditEntryPresentation'
import type { CourtUsageContext, StaffBookingActivity } from '../../features/reports/reports.types'
import type { ProfileId } from './auth.types'

describe('Business Actor Identity & ProfileId Invariants', () => {
  describe('Phase 7.1 — Backend cancellation authority', () => {
    it('does not use User/Profile identity to block an online cancellation attempt', () => {
      // Backend scope and authorization decide whether this transaction may be cancelled.
      // If code wrongly used User.id (50), this staff user would be allowed to cancel someone else's transaction!
      const transactionCreatedByProfile50: Transaction = {
        id: 101,
        amount: '150.00',
        payment_method: 'CASH',
        created_by: 50 as ProfileId,
        created_by_username: 'other_collector',
        is_cancelled: false,
        is_settled: false,
      }

      const cancellationForDifferentProfile = getTransactionCancelState(
        transactionCreatedByProfile50,
        {},
      )

      expect(cancellationForDifferentProfile.canCancel).toBe(true)

      // Transaction created by Profile ID 12 (this user's operational profile)
      const transactionCreatedByProfile12: Transaction = {
        id: 102,
        amount: '150.00',
        payment_method: 'CASH',
        created_by: 12 as ProfileId,
        created_by_username: 'my_collector',
        is_cancelled: false,
        is_settled: false,
      }

      const cancellationForOwnProfile = getTransactionCancelState(
        transactionCreatedByProfile12,
        {},
      )

      expect(cancellationForOwnProfile.canCancel).toBe(true)
    })
  })

  describe('Phase 7.2 — Booking Actor Test', () => {
    it('treats booking.created_by and last_status_changed_by as ProfileId and respects system labels', () => {
      const creatorProfileId: ProfileId = 12
      const updaterProfileId: ProfileId = 14

      const staffBooking: BookingListItem = {
        id: 1,
        court: 3,
        start_time: '2026-09-22T10:00:00Z',
        end_time: '2026-09-22T11:00:00Z',
        status: 'CONFIRMED',
        is_recurring: false,
        recurrence_status: null,
        previous_recurring_booking_id: null,
        next_recurring_booking_id: null,
        created_by: creatorProfileId,
        created_by_name: 'أحمد الموظف',
        last_status_changed_by: updaterProfileId,
        last_status_changed_by_name: 'سارة المشرفة',
      }

      expect(staffBooking.created_by).toBe(12)
      expect(staffBooking.last_status_changed_by).toBe(14)
      expect(staffBooking.last_status_changed_by_name).toBe('سارة المشرفة')

      // System automatic transition: actor is null, system label is provided by backend
      const systemUpdatedBooking: BookingListItem = {
        id: 2,
        court: 3,
        start_time: '2026-09-22T12:00:00Z',
        end_time: '2026-09-22T13:00:00Z',
        status: 'COMPLETED',
        is_recurring: false,
        recurrence_status: null,
        previous_recurring_booking_id: null,
        next_recurring_booking_id: null,
        created_by: creatorProfileId,
        last_status_changed_by: null,
        last_status_changed_by_name: 'System (Automatic)',
      }

      expect(systemUpdatedBooking.last_status_changed_by).toBeNull()
      expect(systemUpdatedBooking.last_status_changed_by_name).toBe('System (Automatic)')
    })
  })

  describe('Phase 7.3 — Settlement Actor Separation Test', () => {
    it('keeps settled_by and collected_by strictly separate as ProfileId actors', () => {
      const collectorProfileId: ProfileId = 15
      const reviewerProfileId: ProfileId = 9

      const preview: SettlementPreview = {
        club: 1,
        collected_by: collectorProfileId,
        collected_by_name: 'محمود المحصل',
        is_self_preview: false,
        can_approve: true,
        approval_required: true,
        period_start: '2026-09-01T00:00:00Z',
        period_end: '2026-09-07T23:59:59Z',
        transaction_count: 5,
        net_amount: '1000.00',
        total_amount: '1000.00',
        booking_payments: '1000.00',
        booking_refunds: '0.00',
        totals_by_payment_method: { CASH: '1000.00' },
        transactions: [],
      }

      expect(preview.collected_by).toBe(15)
      expect(preview.collected_by_name).toBe('محمود المحصل')

      const settlementRecord: Settlement = {
        id: 501,
        club: 1,
        collected_by: collectorProfileId,
        collected_by_name: 'محمود المحصل',
        settled_by: { id: reviewerProfileId, name: 'طارق المالك' },
        settled_at: '2026-09-08T12:00:00Z',
        created: '2026-09-08T11:00:00Z',
        total_amount: '1000.00',
        transaction_count: 5,
      }

      // Verify they do not share identities
      expect(settlementRecord.collected_by).toBe(15)
      expect(settlementRecord.settled_by).toEqual({ id: 9, name: 'طارق المالك' })
      expect(settlementRecord.collected_by).not.toEqual((settlementRecord.settled_by as { id: number }).id)

      // Formatter formats snapshot correctly
      expect(formatSettlementActor(settlementRecord.settled_by)).toBe('طارق المالك')
      expect(formatSettlementActor(null)).toBe('غير متاح')
    })
  })

  describe('Phase 7.4 — Audit Log System Event Test', () => {
    it('renders system events correctly when actor is null without attempting user lookup', () => {
      const systemAuditEntry: AuditLogEntry = {
        id: 801,
        club: 1,
        action: 'BOOKING_AUTO_COMPLETED',
        action_label: 'إكمال تلقائي للحجز',
        entity_type: 'booking',
        entity_id: 123,
        actor: null,
        actor_name: null,
        actor_name_source: 'UNAVAILABLE',
        created: '2026-09-22T02:00:00Z',
        description: 'اكتمل الحجز تلقائياً بانتهاء الوقت',
      }

      const presentation = getAuditEntryPresentation(systemAuditEntry)

      // actorLabel is undefined for system events
      expect(presentation.actorLabel).toBeUndefined()
      expect(presentation.title).toBe('إكمال تلقائي للحجز')
      expect(presentation.description).toBe('اكتمل الحجز تلقائياً بانتهاء الوقت')
    })

    it('renders profile actor name when present in audit log', () => {
      const operatorAuditEntry: AuditLogEntry = {
        id: 802,
        club: 1,
        action: 'TRANSACTION_CANCELLED',
        action_label: 'إلغاء معاملة',
        entity_type: 'transaction',
        entity_id: 456,
        actor: { id: 12 as ProfileId, name: 'سارة المشرفة' },
        actor_name: 'سارة المشرفة',
        actor_name_source: 'EVENT_SNAPSHOT',
        created: '2026-09-22T02:15:00Z',
      }

      const presentation = getAuditEntryPresentation(operatorAuditEntry)
      expect(presentation.actorLabel).toBe('سارة المشرفة')
    })
  })

  describe('Phase 7.5 — Reports & Analytics Actor Test', () => {
    it('uses ProfileId for staff filters and context', () => {
      const staffActorId: ProfileId = 22

      const context: CourtUsageContext = {
        club_id: 1,
        club_name: 'نادي النصر',
        date_from: '2026-09-01',
        date_to: '2026-09-07',
        court: null,
        court_name: null,
        period: 'all_day',
        hour_from: null,
        hour_to: null,
        staff: staffActorId,
        staff_name: 'إبراهيم الموظف',
        status: null,
        included_statuses: ['CONFIRMED', 'COMPLETED'],
        demand_bucket_minutes: 60,
      }

      const staffActivity: StaffBookingActivity = {
        staff: staffActorId,
        staff_name: 'إبراهيم الموظف',
        booking_count: 15,
        occupied_minutes: 900,
        status_counts: { COMPLETED: 15 },
        financial: {
          total_booking_value: '3000.00',
          total_paid_amount: '3000.00',
          total_remaining_amount: '0.00',
        },
      }

      expect(context.staff).toBe(22)
      expect(staffActivity.staff).toBe(22)
    })
  })
})
