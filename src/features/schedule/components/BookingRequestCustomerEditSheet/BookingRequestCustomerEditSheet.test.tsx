import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { BookingIntentRecord } from '../../../../offline/offline.types'
import { BookingRequestCustomerEditSheet } from './BookingRequestCustomerEditSheet'

const mockRequest: BookingIntentRecord = {
  local_id: 'local-req-123',
  scope_key: 'user-1_club-test',
  user_id: 1,
  club_slug: 'test-club',
  court_id: 7,
  requested_date: '2026-07-21',
  requested_start: '2026-07-21T20:00:00',
  requested_end: '2026-07-21T21:00:00',
  client_request_id: 'client-req-uuid-1',
  customer_name: 'محمد صلاح',
  customer_phone: '+201012345678',
  notes: 'ملاحظة أولية',
  requested_recurring: false,
  status: 'NEEDS_REVIEW',
  review_reason: 'INVALID_CUSTOMER_DATA',
  created_at: '2026-07-21T10:00:00Z',
  updated_at: '2026-07-21T10:00:00Z',
  last_attempt_at: null,
  resolved_booking_id: null,
  original_slot_snapshot: {
    date: '2026-07-21',
    start_time: '20:00',
    end_time: '21:00',
    slot_price: '150.00',
    slot_status: 'FREE',
    is_available: true,
    booking: null,
    recurring_anchor_booking_id: null,
    recurring_context: null,
    can_start_recurring: false,
    recurring_blocked_reason: null,
    first_recurring_conflict_start: null,
    label: null,
  },
}

describe('BookingRequestCustomerEditSheet', () => {
  it('renders initial request data and submits normalized fields', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)

    render(
      <BookingRequestCustomerEditSheet
        isSubmitting={false}
        onClose={vi.fn()}
        onSubmit={onSubmit}
        request={mockRequest}
      />,
    )

    expect(screen.getByLabelText('اسم العميل')).toHaveValue('محمد صلاح')
    expect(screen.getByLabelText('رقم الموبايل')).toHaveValue('+201012345678')
    expect(screen.getByLabelText('ملاحظات')).toHaveValue('ملاحظة أولية')

    const nameInput = screen.getByLabelText('اسم العميل')
    await user.clear(nameInput)
    await user.type(nameInput, 'طارق مصطفى')

    await user.click(screen.getByRole('button', { name: 'حفظ التعديل' }))

    expect(onSubmit).toHaveBeenCalledWith({
      customer_name: 'طارق مصطفى',
      customer_phone: '+201012345678',
      notes: 'ملاحظة أولية',
    })
  })

  it('preserves raw unformatted phone while typing and normalizes to E.164 on submit', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)

    render(
      <BookingRequestCustomerEditSheet
        isSubmitting={false}
        onClose={vi.fn()}
        onSubmit={onSubmit}
        request={mockRequest}
      />,
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'إغلاق' })).toHaveFocus()
    })

    const phoneInput = screen.getByLabelText('رقم الموبايل')
    await user.clear(phoneInput)
    await user.type(phoneInput, '011 2345 6789')

    // Remains raw during editing
    expect(phoneInput).toHaveValue('011 2345 6789')

    await user.click(screen.getByRole('button', { name: 'حفظ التعديل' }))

    expect(onSubmit).toHaveBeenCalledWith({
      customer_name: 'محمد صلاح',
      customer_phone: '+201123456789',
      notes: 'ملاحظة أولية',
    })
  })

  it('blocks submission and shows error for invalid phone number', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)

    render(
      <BookingRequestCustomerEditSheet
        isSubmitting={false}
        onClose={vi.fn()}
        onSubmit={onSubmit}
        request={mockRequest}
      />,
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'إغلاق' })).toHaveFocus()
    })

    const phoneInput = screen.getByLabelText('رقم الموبايل')
    await user.clear(phoneInput)
    await user.type(phoneInput, '01012')

    await user.click(screen.getByRole('button', { name: 'حفظ التعديل' }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText('رقم الموبايل غير صحيح')).toBeInTheDocument()
  })

  it('uses selected country as parsing context for local numbers', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)

    render(
      <BookingRequestCustomerEditSheet
        isSubmitting={false}
        onClose={vi.fn()}
        onSubmit={onSubmit}
        request={mockRequest}
      />,
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'إغلاق' })).toHaveFocus()
    })

    const phoneInput = screen.getByLabelText('رقم الموبايل')
    await user.clear(phoneInput)
    await user.type(phoneInput, '501234567')

    const countryButton = screen.getByRole('button', {
      name: 'الدولة أو المنطقة',
    })
    await user.click(countryButton)

    const saudiOption = screen.getByRole('option', { name: /SA \+966/ })
    await user.click(saudiOption)

    // Raw value stays untouched after changing country
    expect(phoneInput).toHaveValue('501234567')

    await user.click(screen.getByRole('button', { name: 'حفظ التعديل' }))

    // Submitted with Saudi E.164
    expect(onSubmit).toHaveBeenCalledWith({
      customer_name: 'محمد صلاح',
      customer_phone: '+966501234567',
      notes: 'ملاحظة أولية',
    })
  })
})
