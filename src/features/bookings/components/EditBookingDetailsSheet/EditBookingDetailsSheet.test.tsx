import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { BookingListItem } from '../../../schedule/scheduleApi.types'
import { listClubPlayers } from '../../../players/playersApi'
import { EditBookingDetailsSheet } from './EditBookingDetailsSheet'

vi.mock('../../../players/playersApi', () => ({
  listClubPlayers: vi.fn(),
}))

const mockedListClubPlayers = vi.mocked(listClubPlayers)

const booking: BookingListItem = {
  id: 10,
  court: 7,
  customer_name: 'أحمد علي',
  customer_phone: '+201012345678',
  notes: 'ملاحظة قديمة',
  start_time: '2026-07-21T20:00:00',
  end_time: '2026-07-21T21:00:00',
  status: 'CONFIRMED',
  is_recurring: false,
  recurrence_status: null,
  previous_recurring_booking_id: null,
  next_recurring_booking_id: null,
}

describe('EditBookingDetailsSheet', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    document.documentElement.lang = 'ar'
  })

  it('edits customer name, phone, and notes without identity IDs', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)

    render(
      <EditBookingDetailsSheet
        booking={booking}
        clubSlug="nasr-club"
        error={null}
        isSubmitting={false}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    )

    expect(screen.getByRole('dialog', { name: 'تعديل بيانات الحجز' }))
      .toBeInTheDocument()
    expect(
      screen.queryByText('بيانات العميل (للقراءة فقط)'),
    ).not.toBeInTheDocument()

    const nameInput = screen.getByRole('combobox', { name: 'اسم اللاعب' })
    const phoneInput = screen.getByLabelText('رقم الموبايل')
    const notesInput = screen.getByLabelText('ملاحظات')

    expect(nameInput).toHaveValue('أحمد علي')
    expect(notesInput).toHaveValue('ملاحظة قديمة')

    await user.clear(nameInput)
    await user.type(nameInput, 'أحمد حسن')
    await user.clear(phoneInput)
    await user.type(phoneInput, '01000000002')
    await user.clear(notesInput)
    await user.type(notesInput, 'ملاحظة محدثة')

    await user.click(screen.getByRole('button', { name: 'حفظ التعديلات' }))

    expect(onSubmit).toHaveBeenCalledWith({
      customer_name: 'أحمد حسن',
      customer_phone: '+201000000002',
      notes: 'ملاحظة محدثة',
    })
    const payload = onSubmit.mock.calls[0][0] as Record<string, unknown>
    expect(payload).not.toHaveProperty('player_profile_id')
    expect(payload).not.toHaveProperty('club_player_id')
    expect(payload).not.toHaveProperty('selectedPlayerId')
    expect(payload).not.toHaveProperty('court')
  })

  it('fills name and phone from a player suggestion without retaining club_player_id', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)

    mockedListClubPlayers.mockResolvedValueOnce([
      {
        id: 50,
        display_name: 'أحمد حسن',
        phone_number: '01000000002',
        player_number: 1,
        player_profile: {
          id: 10,
          phone_number: '01000000002',
          full_name: 'أحمد حسن',
          verified: true,
          has_account: false,
          created_at: '2026-09-01T12:00:00Z',
          updated_at: '2026-09-01T12:00:00Z',
        },
        last_used_at: '2026-09-12T10:00:00Z',
      },
    ])

    render(
      <EditBookingDetailsSheet
        booking={booking}
        clubSlug="nasr-club"
        error={null}
        isSubmitting={false}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    )

    const phoneInput = screen.getByLabelText('رقم الموبايل')
    fireEvent.change(phoneInput, { target: { value: '01000000002' } })

    await waitFor(() => {
      expect(mockedListClubPlayers).toHaveBeenCalledWith('nasr-club', {
        search: '01000000002',
        order_by: '-last_used_at',
      })
    })

    await user.click(screen.getByRole('button', { name: 'عرض قائمة اللاعبين' }))
    await waitFor(() => expect(screen.getByText('أحمد حسن')).toBeInTheDocument())
    await user.click(screen.getByText('أحمد حسن'))

    await user.click(screen.getByRole('button', { name: 'حفظ التعديلات' }))

    expect(onSubmit).toHaveBeenCalledWith({
      customer_name: 'أحمد حسن',
      customer_phone: '+201000000002',
      notes: 'ملاحظة قديمة',
    })
    const payload = onSubmit.mock.calls[0][0] as Record<string, unknown>
    expect(payload).not.toHaveProperty('club_player_id')
    expect(payload).not.toHaveProperty('player_profile_id')
    expect(payload).not.toEqual(expect.objectContaining({ id: 50 }))
  })

  it('shows field errors for identity and notes', () => {
    render(
      <EditBookingDetailsSheet
        booking={booking}
        error={null}
        fieldErrors={{
          customer_name: [{ message: 'الاسم مطلوب', code: 'required' }],
          customer_phone: [{ message: 'رقم الهاتف غير صالح.', code: 'INVALID_PHONE' }],
          notes: [{ message: 'الملاحظات طويلة جدًا', code: 'max_length' }],
        }}
        isSubmitting={false}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByText('الاسم مطلوب')).toBeInTheDocument()
    expect(screen.getByText('رقم الهاتف غير صالح.')).toBeInTheDocument()
    expect(screen.getByText('الملاحظات طويلة جدًا')).toBeInTheDocument()
  })

  it('displays general error message when provided', () => {
    render(
      <EditBookingDetailsSheet
        booking={booking}
        error="حدث خطأ في الخادم"
        isSubmitting={false}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByText('حدث خطأ في الخادم')).toBeInTheDocument()
  })

  it('prompts for unsaved changes when closing with modified identity', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(
      <EditBookingDetailsSheet
        booking={booking}
        error={null}
        isSubmitting={false}
        onClose={onClose}
        onSubmit={vi.fn()}
      />,
    )

    const notesInput = screen.getByLabelText('ملاحظات')
    fireEvent.change(notesInput, { target: { value: 'ملاحظة قديمة معدلة' } })

    await user.click(screen.getByRole('button', { name: 'إغلاق' }))

    expect(
      screen.getByText('عندك تعديلات لسه متحفظتش.'),
    ).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'اخرج من غير حفظ' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
