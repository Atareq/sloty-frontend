import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ScheduleBooking } from '../../schedule.types'
import { RescheduleBookingSheet } from './RescheduleBookingSheet'

const slots: ScheduleBooking[] = [
  {
    id: 'slot-0600',
    status: 'available',
    startTime: '06:00',
    endTime: '07:00',
    period: 'day',
  },
  {
    id: 'slot-0700',
    status: 'confirmed',
    startTime: '07:00',
    endTime: '08:00',
    period: 'day',
  },
  {
    id: 'slot-0800',
    status: 'cancelled',
    startTime: '08:00',
    endTime: '09:00',
    period: 'day',
  },
]

function renderSheet(
  props: Partial<Parameters<typeof RescheduleBookingSheet>[0]> = {},
) {
  return render(
    <RescheduleBookingSheet
      bookingId={10}
      courtName="ملعب 1"
      dateLabel="الخميس، ٢ يوليو"
      error={null}
      isSubmitting={false}
      onClose={vi.fn()}
      onSubmit={vi.fn()}
      slots={slots}
      {...props}
    />,
  )
}

describe('RescheduleBookingSheet', () => {
  it('renders available and cancelled slots only', () => {
    renderSheet()

    expect(screen.getByRole('heading', { name: 'تغيير الموعد' }))
      .toBeInTheDocument()
    expect(screen.getByRole('button', { name: '06:00 - 07:00' }))
      .toBeInTheDocument()
    expect(screen.getByRole('button', { name: '08:00 - 09:00' }))
      .toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '07:00 - 08:00' }))
      .not.toBeInTheDocument()
  })

  it('blocks submit without a selected slot', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    renderSheet({ onSubmit })

    await user.click(screen.getByRole('button', { name: 'تأكيد تغيير الموعد' }))

    expect(screen.getByText('اختر موعدًا جديدًا أولًا')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits the selected slot', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    renderSheet({ onSubmit })

    await user.click(screen.getByRole('button', { name: '08:00 - 09:00' }))
    await user.click(screen.getByRole('button', { name: 'تأكيد تغيير الموعد' }))

    expect(onSubmit).toHaveBeenCalledWith(slots[2])
  })

  it('shows an empty state when no available or cancelled slots exist', () => {
    renderSheet({
      slots: [
        {
          id: 'slot-0700',
          status: 'confirmed',
          startTime: '07:00',
          endTime: '08:00',
          period: 'day',
        },
      ],
    })

    expect(screen.getByText('لا توجد مواعيد متاحة في هذا اليوم'))
      .toBeInTheDocument()
  })

  it('calls onClose when cancel is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    renderSheet({ onClose })

    await user.click(screen.getByRole('button', { name: 'إلغاء' }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
