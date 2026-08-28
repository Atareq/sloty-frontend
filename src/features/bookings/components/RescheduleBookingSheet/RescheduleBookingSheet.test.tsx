import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { listCourts } from '../../../courts/courtsApi'
import { listBookingSlots } from '../../../schedule/scheduleApi'
import type { BookingListItem } from '../../../schedule/scheduleApi.types'
import { RescheduleBookingSheet } from './RescheduleBookingSheet'

vi.mock('../../../courts/courtsApi', () => ({
  listCourts: vi.fn(),
}))

vi.mock('../../../schedule/scheduleApi', () => ({
  listBookingSlots: vi.fn(),
}))

const mockedListCourts = vi.mocked(listCourts)
const mockedListBookingSlots = vi.mocked(listBookingSlots)

const booking: BookingListItem = {
  id: 10,
  court: 7,
  customer_name: 'أحمد علي',
  start_time: '2026-12-01T20:00:00+03:00',
  end_time: '2026-12-01T21:00:00+03:00',
  status: 'HOLD',
  is_recurring: false,
  recurrence_status: null,
  previous_recurring_booking_id: null,
  next_recurring_booking_id: null,
}

describe('RescheduleBookingSheet', () => {
  beforeEach(() => {
    mockedListCourts.mockResolvedValue({
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          id: 7,
          club: 1,
          name: 'ملعب 1',
          sport_type: 'PADEL',
          default_price: '250.00',
          minimum_deposit: '100.00',
          cancellation_refund_notice_days: 1,
          slot_duration_minutes: 60,
          is_active: true,
          requires_digital_payment_reference: false,
          internal_hold_expiry_hours: 2,
        },
      ],
    })
    mockedListBookingSlots.mockResolvedValue({
      court: 7,
      court_name: 'ملعب 1',
      date_from: '2026-12-01',
      date_to: '2026-12-01',
      slot_duration_minutes: 60,
      message: null,
      slots: [
        {
          date: '2026-12-01',
          start_time: '18:00',
          end_time: '19:00',
          slot_status: 'FREE',
          is_available: true,
          slot_price: '250.00',
          booking: null,
          recurring_anchor_booking_id: null,
          recurring_context: null,
          can_start_recurring: true,
          recurring_blocked_reason: null,
          first_recurring_conflict_start: null,
          label: 'متاح',
        },
      ],
    })
  })

  it('posts the selected backend slot without inventing an alternative', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)

    render(
      <RescheduleBookingSheet
        assignedCourtId={null}
        booking={booking}
        canChooseCourt
        clubSlug="nasr-club"
        error={null}
        isSubmitting={false}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    )

    await user.click(await screen.findByRole('button', { name: '6:00 م' }))
    await user.click(screen.getByRole('button', { name: 'تأكيد تغيير الموعد' }))

    expect(onSubmit).toHaveBeenCalledWith({
      court: 7,
      start_time: '2026-12-01T18:00:00',
      end_time: '2026-12-01T19:00:00',
    })
  })

  it('keeps the selected slot after a conflict and refreshes availability', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockRejectedValue(new Error('slot taken'))
    const freeResponse = {
      court: 7,
      court_name: 'ملعب 1',
      date_from: '2026-12-01',
      date_to: '2026-12-01',
      slot_duration_minutes: 60,
      message: null,
      slots: [
        {
          date: '2026-12-01',
          start_time: '18:00',
          end_time: '19:00',
          slot_status: 'FREE' as const,
          is_available: true,
          slot_price: '250.00',
          booking: null,
          recurring_anchor_booking_id: null,
          recurring_context: null,
          can_start_recurring: true,
          recurring_blocked_reason: null,
          first_recurring_conflict_start: null,
          label: 'متاح',
        },
      ],
    }
    const takenResponse = {
      ...freeResponse,
      slots: [
        {
          ...freeResponse.slots[0],
          slot_status: 'HOLD' as const,
          is_available: false,
          can_start_recurring: null,
          label: 'بانتظار العربون',
        },
      ],
    }
    let slotLoads = 0
    mockedListBookingSlots.mockImplementation(() => {
      slotLoads += 1
      return Promise.resolve(
        onSubmit.mock.calls.length > 0 ? takenResponse : freeResponse,
      )
    })

    render(
      <RescheduleBookingSheet
        assignedCourtId={null}
        booking={booking}
        canChooseCourt
        clubSlug="nasr-club"
        error="المعاد مبقاش متاح. اختار ميعاد تاني."
        isSubmitting={false}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    )

    await user.click(await screen.findByRole('button', { name: '6:00 م' }))
    await user.click(screen.getByRole('button', { name: 'تأكيد تغيير الموعد' }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1)
      expect(slotLoads).toBeGreaterThan(1)
    })
    expect(screen.queryByRole('button', { name: '6:00 م' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '8:00 م' })).not.toBeInTheDocument()
  })
})
