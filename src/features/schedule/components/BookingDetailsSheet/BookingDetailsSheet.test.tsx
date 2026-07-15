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
  period: 'day',
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
      onCancel={vi.fn()}
      onComplete={vi.fn()}
      onClose={vi.fn()}
      onNoShow={vi.fn()}
      onReschedule={vi.fn()}
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
      screen.getByRole('button', { name: 'تغيير الموعد' }),
    ).toBeInTheDocument()
  })

  it('calls onAddPayment from confirmed bookings', async () => {
    const user = userEvent.setup()
    const onAddPayment = vi.fn()

    renderBookingDetails({ onAddPayment })

    await user.click(screen.getByRole('button', { name: 'إضافة دفعة' }))

    expect(onAddPayment).toHaveBeenCalledWith(booking)
  })

  it('calls onReschedule from confirmed bookings', async () => {
    const user = userEvent.setup()
    const onReschedule = vi.fn()

    renderBookingDetails({ onReschedule })

    await user.click(screen.getByRole('button', { name: 'تغيير الموعد' }))

    expect(onReschedule).toHaveBeenCalledWith(booking)
  })

  it('uses an inline confirm step before calling cancel', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn().mockResolvedValue(undefined)

    renderBookingDetails({ onCancel })

    await user.click(screen.getByRole('button', { name: 'إلغاء الحجز' }))

    expect(onCancel).not.toHaveBeenCalled()
    expect(
      screen.getByRole('button', { name: 'تأكيد إلغاء الحجز' }),
    ).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: 'تأكيد إلغاء الحجز' }),
    )

    expect(onCancel).toHaveBeenCalledWith(10)
  })

  it('uses an inline confirm step before calling complete', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn().mockResolvedValue(undefined)

    renderBookingDetails({ onComplete })

    await user.click(screen.getByRole('button', { name: 'إكمال الحجز' }))

    expect(onComplete).not.toHaveBeenCalled()
    expect(
      screen.getByRole('button', { name: 'تأكيد إكمال الحجز' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'رجوع' })).toBeInTheDocument()
    expect(
      screen.getByText('سيتم اعتبار الحجز مكتملاً بعد التأكيد.'),
    ).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: 'تأكيد إكمال الحجز' }),
    )

    expect(onComplete).toHaveBeenCalledWith(10)
  })

  it('returns from an inline confirm step without calling the handler', async () => {
    const user = userEvent.setup()
    const onNoShow = vi.fn().mockResolvedValue(undefined)

    renderBookingDetails({ onNoShow })

    await user.click(screen.getByRole('button', { name: 'تسجيل عدم حضور' }))
    await user.click(screen.getByRole('button', { name: 'رجوع' }))

    expect(onNoShow).not.toHaveBeenCalled()
    expect(
      screen.getByRole('button', { name: 'تسجيل عدم حضور' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'تأكيد عدم الحضور' }),
    ).not.toBeInTheDocument()
  })

  it('uses an inline confirm step before calling no-show', async () => {
    const user = userEvent.setup()
    const onNoShow = vi.fn().mockResolvedValue(undefined)

    renderBookingDetails({ onNoShow })

    await user.click(screen.getByRole('button', { name: 'تسجيل عدم حضور' }))

    expect(onNoShow).not.toHaveBeenCalled()
    expect(
      screen.getByRole('button', { name: 'تأكيد عدم الحضور' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('سيتم تسجيل العميل كعدم حضور بعد التأكيد.'),
    ).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: 'تأكيد عدم الحضور' }),
    )

    expect(onNoShow).toHaveBeenCalledWith(10)
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
      screen.queryByRole('button', { name: 'تغيير الموعد' }),
    ).not.toBeInTheDocument()
  })
})
