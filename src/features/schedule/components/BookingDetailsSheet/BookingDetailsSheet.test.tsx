import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ScheduleBooking } from '../../schedule.types'
import type { BookingListItem } from '../../scheduleApi.types'
import { BookingDetailsSheet } from './BookingDetailsSheet'

const booking: BookingListItem = {
  id: 10,
  court: 7,
  customer_name: 'أحمد علي',
  customer_phone: '01000000000',
  start_time: '2026-07-02T07:00:00',
  end_time: '2026-07-02T08:00:00',
  status: 'CONFIRMED',
}

const slot: ScheduleBooking = {
  id: 'slot-0700',
  status: 'confirmed',
  startTime: '07:00',
  endTime: '08:00',
  period: 'am',
  booking,
}

function renderBookingDetails(
  props: Partial<Parameters<typeof BookingDetailsSheet>[0]> = {},
) {
  return render(
    <BookingDetailsSheet
      booking={booking}
      courtName="ملعب 1"
      dateLabel="الخميس، ٢ يوليو"
      error={null}
      isSubmitting={false}
      onAddPayment={vi.fn()}
      onClose={vi.fn()}
      onRequestCancel={vi.fn()}
      onRequestComplete={vi.fn()}
      onRequestNoShow={vi.fn()}
      slot={slot}
      {...props}
    />,
  )
}

describe('BookingDetailsSheet', () => {
  it('shows confirmed booking customer details', () => {
    renderBookingDetails()

    expect(screen.getByText('أحمد علي')).toBeInTheDocument()
    expect(screen.getByText('01000000000')).toBeInTheDocument()
    expect(screen.getByText('مؤكد')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'إكمال الحجز' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'تسجيل عدم حضور' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'إلغاء الحجز' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'إضافة دفعة' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('تغيير الموعد سيتم إضافته بعد اعتماد واجهة الخلفية'),
    ).toBeInTheDocument()
  })

  it('calls onAddPayment from confirmed bookings', async () => {
    const user = userEvent.setup()
    const onAddPayment = vi.fn()

    renderBookingDetails({ onAddPayment })

    await user.click(screen.getByRole('button', { name: 'إضافة دفعة' }))

    expect(onAddPayment).toHaveBeenCalledWith(booking)
  })

  it('calls lifecycle request handlers from confirmed bookings', async () => {
    const user = userEvent.setup()
    const onRequestComplete = vi.fn()
    const onRequestNoShow = vi.fn()
    const onRequestCancel = vi.fn()

    renderBookingDetails({
      onRequestCancel,
      onRequestComplete,
      onRequestNoShow,
    })

    await user.click(screen.getByRole('button', { name: 'إكمال الحجز' }))
    await user.click(screen.getByRole('button', { name: 'تسجيل عدم حضور' }))
    await user.click(screen.getByRole('button', { name: 'إلغاء الحجز' }))

    expect(onRequestComplete).toHaveBeenCalledWith(booking)
    expect(onRequestNoShow).toHaveBeenCalledWith(booking)
    expect(onRequestCancel).toHaveBeenCalledWith(booking)
  })

  it('hides lifecycle actions for cancelled bookings', () => {
    renderBookingDetails({
      booking: {
        ...booking,
        status: 'CANCELLED',
      },
    })

    expect(
      screen.queryByRole('button', { name: 'إكمال الحجز' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'تسجيل عدم حضور' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'إلغاء الحجز' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'إضافة دفعة' }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByText('هذا الحجز ملغي ولا يؤثر على توفر الموعد'),
    ).toBeInTheDocument()
  })

  it.each([
    ['COMPLETED' as const, 'هذا الحجز مكتمل ولا يمكن تعديله'],
    ['NO_SHOW' as const, 'تم تسجيل هذا الحجز كعدم حضور'],
    ['EXPIRED' as const, 'انتهت صلاحية هذا الحجز'],
  ])('shows locked message for %s bookings', (status, message) => {
    renderBookingDetails({
      booking: {
        ...booking,
        status,
      },
    })

    expect(screen.getByText(message)).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'إلغاء الحجز' }),
    ).not.toBeInTheDocument()
  })
})
