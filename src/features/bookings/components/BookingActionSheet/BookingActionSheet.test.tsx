import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { BookingListItem } from '../../../schedule/scheduleApi.types'
import { BookingActionSheet } from './BookingActionSheet'

const baseBooking: BookingListItem = {
  id: 10,
  court: 7,
  customer_name: 'أحمد علي',
  customer_phone: '01000000000',
  start_time: '2026-07-21T20:00:00',
  end_time: '2026-07-21T21:00:00',
  status: 'CONFIRMED',
  total_price: '250.00',
  paid_amount: '100.00',
  remaining_amount: '150.00',
  is_recurring: false,
  recurrence_status: null,
  previous_recurring_booking_id: null,
  next_recurring_booking_id: null,
}

function renderSheet(booking: BookingListItem, props = {}) {
  return render(
    <BookingActionSheet
      booking={booking}
      courtName="ملعب 1"
      isOpen
      onClose={vi.fn()}
      {...props}
    />,
  )
}

describe('BookingActionSheet', () => {
  it('puts customer identity, appointment, state, and zero-safe money first', () => {
    renderSheet({ ...baseBooking, paid_amount: '0.00' })

    expect(screen.getByRole('heading', { name: 'أحمد علي' })).toBeInTheDocument()
    expect(screen.getByText('01000000000')).toHaveAttribute('dir', 'ltr')
    expect(screen.getByText(/الثلاثاء، ٢١ يوليو/)).toBeInTheDocument()
    expect(screen.getByText('ملعب 1')).toBeInTheDocument()
    expect(screen.getByText('الحجز خلص ولسه عليه 150.00 ج.م'))
      .toBeInTheDocument()
    expect(screen.getByText('250.00 جنيه')).toBeInTheDocument()
    expect(screen.getByText('0.00 جنيه')).toBeInTheDocument()
    expect(screen.getByText('150.00 جنيه')).toBeInTheDocument()
    expect(screen.queryByText('CONFIRMED')).not.toBeInTheDocument()
    expect(screen.queryByText(baseBooking.start_time)).not.toBeInTheDocument()
  })

  it('shows one HOLD primary deposit CTA and cancellation under options', async () => {
    const user = userEvent.setup()
    const onAddPayment = vi.fn()
    const onFreeHold = vi.fn()
    const holdBooking: BookingListItem = { ...baseBooking, status: 'HOLD' }

    renderSheet(holdBooking, { onAddPayment, onFreeHold })

    expect(screen.getByText('بانتظار العربون')).toBeInTheDocument()
    await user.click(
      screen.getByRole('button', { name: 'ضيف العربون وأكد الحجز' }),
    )
    expect(onAddPayment).toHaveBeenCalledWith(holdBooking)
    expect(screen.queryByRole('button', { name: 'إضافة دفعة' }))
      .not.toBeInTheDocument()

    await user.click(screen.getByText('••• خيارات أخرى'))
    const cancelButton = screen.getByRole('button', { name: 'إلغاء الحجز' })
    expect(cancelButton).toHaveClass('bg-[var(--sloty-danger)]')
    await user.click(cancelButton)
    expect(onFreeHold).toHaveBeenCalledWith(holdBooking)
  })

  it('prioritizes remaining collection and keeps alternatives secondary', async () => {
    const user = userEvent.setup()
    const onAddPayment = vi.fn()
    const onComplete = vi.fn()
    const onNoShow = vi.fn()
    const onCancel = vi.fn()

    renderSheet(baseBooking, {
      onAddPayment,
      onCancel,
      onComplete,
      onNoShow,
    })

    await user.click(screen.getByRole('button', { name: 'حصّل 150.00 ج.م' }))
    expect(onAddPayment).toHaveBeenCalledWith(baseBooking)
    expect(screen.queryByRole('button', { name: 'إكمال' })).not.toBeInTheDocument()

    await user.click(screen.getByText('••• خيارات أخرى'))
    await user.click(screen.getByRole('button', { name: 'عدم حضور' }))
    await user.click(screen.getByRole('button', { name: 'إلغاء الحجز' }))
    expect(onNoShow).toHaveBeenCalledWith(baseBooking)
    expect(onCancel).toHaveBeenCalledWith(baseBooking)
  })

  it('offers completion only after a fully-paid booking has ended', () => {
    renderSheet(
      { ...baseBooking, paid_amount: '250.00', remaining_amount: '0.00' },
      { onAddPayment: vi.fn(), onComplete: vi.fn() },
    )

    expect(screen.getByText('الحجز خلص ولسه مقفلتوش')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'إكمال' })).toBeInTheDocument()
    expect(screen.queryByText('خيارات أخرى')).not.toBeInTheDocument()
  })

  it('shows recurring context with Backend-owned cancellation semantics', () => {
    renderSheet(
      { ...baseBooking, is_recurring: true, recurrence_status: 'ACTIVE' },
      { onCancel: vi.fn(), onNoShow: vi.fn() },
    )

    expect(screen.getByText('↻ بيتكرر أسبوعيًا')).toBeInTheDocument()
    expect(screen.queryByText('عرض الحجز الأسبوعي')).not.toBeInTheDocument()
    expect(screen.getByText('••• خيارات أخرى')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'إلغاء الحجز' }))
      .toBeInTheDocument()
  })

  it.each(['COMPLETED', 'CANCELLED', 'EXPIRED', 'NO_SHOW'] as const)(
    'renders %s without mutation or redundant close actions',
    (status) => {
      renderSheet({ ...baseBooking, status })

      expect(screen.queryByRole('button', { name: 'إضافة دفعة' }))
        .not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'إكمال' }))
        .not.toBeInTheDocument()
      expect(screen.queryByText('عرض التفاصيل فقط')).not.toBeInTheDocument()
      expect(screen.getAllByRole('button', { name: 'إغلاق' })).toHaveLength(1)
    },
  )

  it('uses AppSheet dismissal without dirty confirmation', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const { rerender } = render(
      <BookingActionSheet
        booking={baseBooking}
        isOpen
        onClose={onClose}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'إغلاق' }))
    expect(onClose).toHaveBeenCalledTimes(1)

    fireEvent.mouseDown(screen.getByTestId('app-sheet-backdrop'))
    expect(onClose).toHaveBeenCalledTimes(2)

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(3)

    rerender(
      <BookingActionSheet
        booking={baseBooking}
        isOpen={false}
        onClose={onClose}
      />,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('does not show engineering roadmap copy', () => {
    renderSheet(baseBooking)

    expect(screen.queryByText(/واجهة الخلفية|سيتم إضافته بعد|بعد اعتماد/))
      .not.toBeInTheDocument()
    expect(screen.queryByText('تحرير الموعد')).not.toBeInTheDocument()
  })
})
