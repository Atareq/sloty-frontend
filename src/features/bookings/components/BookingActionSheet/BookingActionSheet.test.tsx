import { render, screen } from '@testing-library/react'
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
  paid_amount: '100.00',
  remaining_amount: '150.00',
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
  it('renders HOLD allowed actions', async () => {
    const user = userEvent.setup()
    const onAddPayment = vi.fn()
    const onFreeHold = vi.fn()
    const holdBooking: BookingListItem = {
      ...baseBooking,
      status: 'HOLD',
    }

    renderSheet(holdBooking, { onAddPayment, onFreeHold })

    expect(screen.getByRole('heading', { name: 'حجز محجوز مؤقتًا' }))
      .toBeInTheDocument()
    expect(screen.getByText(/الثلاثاء، ٢١ يوليو/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'إضافة دفعة' }))
    await user.click(screen.getByRole('button', { name: 'تحرير الموعد' }))

    expect(onAddPayment).toHaveBeenCalledWith(holdBooking)
    expect(onFreeHold).toHaveBeenCalledWith(holdBooking)
    expect(screen.queryByRole('button', { name: 'إكمال الحجز' }))
      .not.toBeInTheDocument()
  })

  it('renders CONFIRMED allowed actions', async () => {
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

    await user.click(screen.getByRole('button', { name: 'إضافة دفعة' }))
    await user.click(screen.getByRole('button', { name: 'إكمال الحجز' }))
    await user.click(screen.getByRole('button', { name: 'تسجيل عدم حضور' }))
    await user.click(screen.getByRole('button', { name: 'إلغاء الحجز' }))

    expect(onAddPayment).toHaveBeenCalledWith(baseBooking)
    expect(onComplete).toHaveBeenCalledWith(baseBooking)
    expect(onNoShow).toHaveBeenCalledWith(baseBooking)
    expect(onCancel).toHaveBeenCalledWith(baseBooking)
  })

  it('renders COMPLETED bookings as read-only', () => {
    renderSheet({
      ...baseBooking,
      status: 'COMPLETED',
    })

    expect(screen.getByText('هذا الحجز مكتمل ومغلق للعرض فقط'))
      .toBeInTheDocument()
    expect(screen.getByText('عرض التفاصيل فقط')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'إضافة دفعة' }))
      .not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'إكمال الحجز' }))
      .not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'إضافة حجز' }))
      .not.toBeInTheDocument()
  })

  it('renders cancelled, expired, and no-show bookings as details-only', () => {
    for (const status of ['CANCELLED', 'EXPIRED', 'NO_SHOW'] as const) {
      const { unmount } = renderSheet({
        ...baseBooking,
        status,
      })

      expect(screen.getByText('عرض التفاصيل فقط')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'إضافة دفعة' }))
        .not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'إلغاء الحجز' }))
        .not.toBeInTheDocument()
      unmount()
    }
  })
})
