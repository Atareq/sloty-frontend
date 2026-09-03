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
    expect(screen.queryByText('ضيف العربون وأكد الحجز')).not.toBeInTheDocument()
    await user.click(
      screen.getByRole('button', { name: 'سجّل العربون وأكّد الحجز' }),
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

  it('shows complete and no-show together for an ended fully-paid booking', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    const onNoShow = vi.fn()
    const endedBooking: BookingListItem = {
      ...baseBooking,
      remaining_amount: '0.00',
      paid_amount: '250.00',
    }

    renderSheet(endedBooking, { onComplete, onNoShow })

    expect(screen.getByText('انتهى الموعد ولسه محتاج يتقفل')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'تم اللعب' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'عدم حضور' })).toBeInTheDocument()
    expect(screen.queryByText('••• خيارات أخرى')).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'عدم حضور' }).closest('details'),
    ).toBeNull()

    await user.click(screen.getByRole('button', { name: 'عدم حضور' }))
    expect(onNoShow).toHaveBeenCalledWith(endedBooking)
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
    expect(screen.queryByRole('button', { name: 'تم اللعب' })).not.toBeInTheDocument()

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

    expect(screen.getByText('انتهى الموعد ولسه محتاج يتقفل')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'تم اللعب' })).toBeInTheDocument()
    expect(screen.queryByText('خيارات أخرى')).not.toBeInTheDocument()
  })

  it('shows recurring context with Backend-owned cancellation semantics', async () => {
    const user = userEvent.setup()

    renderSheet(
      { ...baseBooking, is_recurring: true, recurrence_status: 'ACTIVE' },
      { onCancel: vi.fn(), onEditCustomer: vi.fn(), onNoShow: vi.fn() },
    )

    expect(screen.getByText('↻ حجز أسبوعي')).toBeInTheDocument()
    await user.click(screen.getByText('••• خيارات أخرى'))
    expect(screen.getByRole('button', { name: 'تعديل بيانات الحجز' }))
      .toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'تغيير الموعد' }))
      .not.toBeInTheDocument()
  })

  it('keeps the weekly marker for ended recurrence without stop action', async () => {
    const user = userEvent.setup()

    renderSheet(
      { ...baseBooking, is_recurring: true, recurrence_status: 'ENDED' },
      { onEndRecurrence: vi.fn() },
    )

    expect(screen.getByText('↻ حجز أسبوعي')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'إيقاف الحجز الأسبوعي' }))
      .not.toBeInTheDocument()
    expect(screen.queryByText('••• خيارات أخرى')).not.toBeInTheDocument()
    await user.keyboard('{Escape}')
  })

  it('keeps stop weekly inline, secondary, and out of other options', async () => {
    const user = userEvent.setup()
    const onEndRecurrence = vi.fn()

    renderSheet(
      { ...baseBooking, is_recurring: true, recurrence_status: 'ACTIVE' },
      { onEndRecurrence, onCancel: vi.fn(), onEditCustomer: vi.fn() },
    )

    expect(screen.getByText('↻ حجز أسبوعي')).toBeInTheDocument()
    expect(screen.getByText('المعاد ده متثبت للعميل كل أسبوع.'))
      .toBeInTheDocument()
    const inlineStop = screen.getByRole('button', { name: 'إيقاف الحجز الأسبوعي' })
    expect(inlineStop.closest('details')).toBeNull()
    expect(inlineStop).not.toHaveClass('bg-[var(--sloty-danger)]')

    await user.click(screen.getByText('••• خيارات أخرى'))
    expect(screen.getByRole('button', { name: 'تعديل بيانات الحجز' }))
      .toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'إلغاء الحجز' }))
      .toHaveClass('bg-[var(--sloty-danger)]')
    expect(
      screen.getAllByRole('button', { name: 'إيقاف الحجز الأسبوعي' }),
    ).toHaveLength(1)

    await user.click(inlineStop)
    expect(screen.getByRole('heading', { name: 'إيقاف الحجز الأسبوعي؟' }))
      .toBeInTheDocument()
    expect(
      screen.getByText(
        'الحجز الحالي هيفضل زي ما هو، لكن المعاد مش هيتحجز تلقائيًا في الأسابيع الجاية.',
      ),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'رجوع' }))
    expect(screen.queryByRole('heading', { name: 'إيقاف الحجز الأسبوعي؟' }))
      .not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'أحمد علي' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'إيقاف الحجز الأسبوعي' }))
    await user.click(screen.getAllByRole('button', { name: 'إيقاف الحجز الأسبوعي' }).at(-1)!)
    expect(onEndRecurrence).toHaveBeenCalledWith(
      expect.objectContaining({ id: baseBooking.id }),
    )
  })

  it('uses hold_expires_at and omits a countdown when it is missing', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-25T12:00:00Z'))

    try {
      const { rerender } = render(
        <BookingActionSheet
          booking={{
            ...baseBooking,
            status: 'HOLD',
            hold_expires_at: '2026-08-25T12:25:00Z',
          }}
          isOpen
          onClose={vi.fn()}
        />,
      )

      expect(screen.getByText('متبقي 25 دقيقة')).toBeInTheDocument()
      expect(screen.queryByText(/تلقائي/)).not.toBeInTheDocument()

      rerender(
        <BookingActionSheet
          booking={{ ...baseBooking, status: 'HOLD', hold_expires_at: null }}
          isOpen
          onClose={vi.fn()}
        />,
      )
      expect(screen.queryByText('متبقي 25 دقيقة')).not.toBeInTheDocument()

      rerender(
        <BookingActionSheet
          booking={{
            ...baseBooking,
            status: 'CONFIRMED',
            hold_expires_at: '2026-08-25T12:25:00Z',
          }}
          isOpen
          onClose={vi.fn()}
        />,
      )
      expect(screen.queryByText('متبقي 25 دقيقة')).not.toBeInTheDocument()

      rerender(
        <BookingActionSheet
          booking={{
            ...baseBooking,
            status: 'HOLD',
            hold_expires_at: '2026-08-25T11:50:00Z',
          }}
          isOpen
          onClose={vi.fn()}
        />,
      )
      expect(screen.getByText('انتهت مهلة دفع العربون')).toBeInTheDocument()
      expect(screen.queryByText('انتهت المهلة')).not.toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it.each(['COMPLETED', 'CANCELLED', 'EXPIRED', 'NO_SHOW'] as const)(
    'renders %s without mutation or redundant close actions',
    (status) => {
      renderSheet({ ...baseBooking, status })

      expect(screen.queryByRole('button', { name: 'إضافة دفعة' }))
        .not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'تم اللعب' }))
        .not.toBeInTheDocument()
      expect(screen.queryByText('عرض التفاصيل فقط')).not.toBeInTheDocument()
      expect(screen.getAllByRole('button', { name: 'إغلاق' })).toHaveLength(1)
      if (status === 'NO_SHOW') {
        expect(screen.getByText('عدم حضور')).toBeInTheDocument()
        expect(screen.queryByText('لم يحضر')).not.toBeInTheDocument()
      }
      if (status === 'EXPIRED') {
        expect(screen.getByText('انتهت المهلة')).toBeInTheDocument()
        expect(screen.queryByText('منتهي')).not.toBeInTheDocument()
      }
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

  it('shows notes only when they exist and hides the empty section', () => {
    renderSheet({
      ...baseBooking,
      notes: 'يحب الإنارة',
    } as BookingListItem)

    expect(screen.getByText('ملاحظات')).toBeInTheDocument()
    expect(screen.getByText('يحب الإنارة')).toBeInTheDocument()
    expect(screen.getByText('يحب الإنارة')).not.toHaveClass(
      'sloty-booking-card-note',
    )
  })

  it('preserves full multiline notes in details without list clamping', () => {
    const note = 'العميل طلب تجهيز الملعب بدري.\nومحتاج الكورة تكون جاهزة.'

    renderSheet({
      ...baseBooking,
      notes: note,
    } as BookingListItem)

    const noteElement = screen.getByText((_, element) => element?.textContent === note)

    expect(noteElement).toHaveClass('whitespace-pre-wrap')
    expect(noteElement).not.toHaveClass('sloty-booking-card-note')
  })

  it('hides notes when the booking has no note text', () => {
    renderSheet({
      ...baseBooking,
      notes: '   \n\t ',
    } as BookingListItem)

    expect(screen.queryByText('ملاحظات')).not.toBeInTheDocument()
    expect(screen.queryByText('لا توجد ملاحظات')).not.toBeInTheDocument()
  })

  it('does not show engineering roadmap copy', () => {
    renderSheet(baseBooking)

    expect(screen.queryByText(/واجهة الخلفية|سيتم إضافته بعد|بعد اعتماد/))
      .not.toBeInTheDocument()
    expect(screen.queryByText('تحرير الموعد')).not.toBeInTheDocument()
  })
})
