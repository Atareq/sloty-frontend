import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiClientError } from '../../../../core/api/apiClient'
import { chooseAppSelectOption } from '../../../../test/appSelectTestUtils'
import { getBookingRecurrenceNext } from '../../scheduleApi'
import type { BookingRecurrenceNextPreview } from '../../scheduleApi.types'
import { CompleteBookingConfirmSheet } from './CompleteBookingConfirmSheet'

vi.mock('../../scheduleApi', () => ({
  getBookingRecurrenceNext: vi.fn(),
}))

const mockedGetBookingRecurrenceNext = vi.mocked(getBookingRecurrenceNext)

const booking = {
  id: 10,
  court: 2,
  start_time: '2026-08-25T18:00:00Z',
  end_time: '2026-08-25T19:00:00Z',
  status: 'CONFIRMED' as const,
  is_recurring: false,
  recurrence_status: null,
  previous_recurring_booking_id: null,
  next_recurring_booking_id: null,
}

const preview: BookingRecurrenceNextPreview = {
  can_continue: true,
  next_start_time: '2026-09-15T20:00:00+03:00',
  next_end_time: '2026-09-15T21:00:00+03:00',
  next_total_price: '350.00',
  next_required_deposit: '150.00',
  requires_payment_reference: false,
}

function renderSheet(
  overrides: Partial<ComponentProps<typeof CompleteBookingConfirmSheet>> = {},
) {
  const props = {
    booking,
    clubSlug: 'nasr-club',
    error: null,
    isSubmitting: false,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    onRequestPayment: vi.fn(),
    remainingAmount: '0.00',
    ...overrides,
  }

  return {
    ...render(<CompleteBookingConfirmSheet {...props} />),
    props,
  }
}

describe('CompleteBookingConfirmSheet', () => {
  beforeEach(() => {
    mockedGetBookingRecurrenceNext.mockReset()
    mockedGetBookingRecurrenceNext.mockResolvedValue(preview)
  })

  it('does not load recurrence-next for a non-recurring booking', async () => {
    renderSheet()

    expect(screen.getByText('بعد التأكيد هيتحسب إن الحجز تم اللعب.'))
      .toBeInTheDocument()
    expect(mockedGetBookingRecurrenceNext).not.toHaveBeenCalled()
  })

  it.each(['RENEWED', 'ENDED'] as const)(
    'does not load recurrence-next for recurring %s bookings',
    (recurrenceStatus) => {
      renderSheet({
        booking: {
          ...booking,
          is_recurring: true,
          recurrence_status: recurrenceStatus,
        },
      })

      expect(mockedGetBookingRecurrenceNext).not.toHaveBeenCalled()
      expect(screen.getByRole('button', { name: 'تأكيد إكمال الحجز' }))
        .toBeInTheDocument()
    },
  )

  it('loads recurrence-next for an active recurring confirmed booking', async () => {
    mockedGetBookingRecurrenceNext.mockResolvedValue(preview)

    renderSheet({
      booking: {
        ...booking,
        is_recurring: true,
        recurrence_status: 'ACTIVE',
      },
    })

    await waitFor(() => {
      expect(mockedGetBookingRecurrenceNext).toHaveBeenCalledWith('nasr-club', 10)
    })
    expect(await screen.findByText('استمرار الموعد الأسبوعي'))
      .toBeInTheDocument()
    expect(screen.getByText('سعر الحجز')).toBeInTheDocument()
    expect(screen.getByText('350.00 جنيه')).toBeInTheDocument()
    expect(screen.getByText('العربون المطلوب')).toBeInTheDocument()
    expect(screen.getByText('150.00 جنيه')).toBeInTheDocument()
    expect(screen.queryByText('2026-09-01')).not.toBeInTheDocument()
  })

  it('does not require payment method when the backend deposit is zero', async () => {
    mockedGetBookingRecurrenceNext.mockResolvedValue({
      ...preview,
      next_required_deposit: '0.00',
    })
    const onConfirm = vi.fn().mockResolvedValue(undefined)

    renderSheet({
      booking: {
        ...booking,
        is_recurring: true,
        recurrence_status: 'ACTIVE',
      },
      onConfirm,
    })

    await screen.findByRole('button', { name: 'إكمال واستمرار أسبوعيًا' })
    expect(screen.queryByLabelText('طريقة الدفع')).not.toBeInTheDocument()

    await userEvent.click(
      screen.getByRole('button', { name: 'إكمال واستمرار أسبوعيًا' }),
    )

    expect(onConfirm).toHaveBeenCalledWith({ continue_recurring: true })
    expect(onConfirm.mock.calls[0][0]).not.toHaveProperty('next_deposit_amount')
  })

  it('requires payment method for a positive deposit and omits reference for cash', async () => {
    mockedGetBookingRecurrenceNext.mockResolvedValue(preview)
    const user = userEvent.setup()
    const onConfirm = vi.fn().mockResolvedValue(undefined)

    renderSheet({
      booking: {
        ...booking,
        is_recurring: true,
        recurrence_status: 'ACTIVE',
      },
      onConfirm,
    })

    await screen.findByLabelText('طريقة الدفع')
    expect(screen.queryByLabelText('مرجع الدفع')).not.toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: 'إكمال واستمرار أسبوعيًا' }),
    )

    expect(onConfirm).toHaveBeenCalledWith({
      continue_recurring: true,
      next_deposit_payment_method: 'CASH',
    })
    expect(onConfirm.mock.calls[0][0]).not.toHaveProperty('next_deposit_amount')
  })

  it('requires reference for digital methods only when backend says so', async () => {
    mockedGetBookingRecurrenceNext.mockResolvedValue({
      ...preview,
      requires_payment_reference: true,
    })
    const user = userEvent.setup()
    const onConfirm = vi.fn().mockResolvedValue(undefined)

    renderSheet({
      booking: {
        ...booking,
        is_recurring: true,
        recurrence_status: 'ACTIVE',
      },
      onConfirm,
    })

    await chooseAppSelectOption(
      user,
      await screen.findByLabelText('طريقة الدفع'),
      'محفظة إلكترونية',
    )
    expect(screen.getByRole('button', { name: 'إكمال واستمرار أسبوعيًا' }))
      .toBeDisabled()

    await user.type(screen.getByLabelText('مرجع الدفع'), 'WALLET-9')
    await user.click(
      screen.getByRole('button', { name: 'إكمال واستمرار أسبوعيًا' }),
    )

    expect(onConfirm).toHaveBeenCalledWith({
      continue_recurring: true,
      next_deposit_payment_method: 'DIGITAL_WALLET',
      next_deposit_payment_reference: 'WALLET-9',
    })
  })

  it('maps a preview slot conflict and keeps stop recurrence available', async () => {
    mockedGetBookingRecurrenceNext.mockRejectedValue(
      new ApiClientError('English backend message', 409, {
        code: 'NEXT_RECURRING_SLOT_UNAVAILABLE',
      }),
    )

    renderSheet({
      booking: {
        ...booking,
        is_recurring: true,
        recurrence_status: 'ACTIVE',
      },
    })

    expect(
      await screen.findByText(
        'الموعد الأسبوع القادم مش متاح. تقدر تكمل الحجز وتوقف التكرار.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'إكمال واستمرار أسبوعيًا' }))
      .not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'إكمال وإيقاف الحجز الأسبوعي' }))
      .toBeInTheDocument()
  })

  it('hides continuation when recurrence is no longer active', async () => {
    mockedGetBookingRecurrenceNext.mockRejectedValue(
      new ApiClientError('English backend message', 409, {
        code: 'BOOKING_RECURRENCE_NOT_ACTIVE',
      }),
    )

    renderSheet({
      booking: {
        ...booking,
        is_recurring: true,
        recurrence_status: 'ACTIVE',
      },
    })

    expect(await screen.findByRole('button', { name: 'تأكيد إكمال الحجز' }))
      .toBeInTheDocument()
    expect(screen.queryByText('استمرار الموعد الأسبوعي')).not.toBeInTheDocument()
  })

  it('refetches preview after a complete-time recurrence race', async () => {
    mockedGetBookingRecurrenceNext.mockResolvedValue(preview)
    const onConfirm = vi.fn().mockRejectedValueOnce(
      new ApiClientError('English backend message', 409, {
        code: 'NEXT_RECURRING_SLOT_UNAVAILABLE',
      }),
    )

    renderSheet({
      booking: {
        ...booking,
        is_recurring: true,
        recurrence_status: 'ACTIVE',
      },
      onConfirm,
    })

    await userEvent.click(
      await screen.findByRole('button', { name: 'إكمال واستمرار أسبوعيًا' }),
    )

    await waitFor(() => {
      expect(mockedGetBookingRecurrenceNext.mock.calls.length).toBeGreaterThanOrEqual(2)
    })
  })

  it('shows payment-required state when remaining amount is positive', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    const onRequestPayment = vi.fn()

    renderSheet({
      remainingAmount: '50.00',
      onConfirm,
      onRequestPayment,
    })

    expect(mockedGetBookingRecurrenceNext).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'تسجيل الدفعة' }))
    expect(onRequestPayment).toHaveBeenCalledTimes(1)
    expect(onConfirm).not.toHaveBeenCalled()
  })
})
