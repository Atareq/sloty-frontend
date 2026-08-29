import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ScheduleBooking } from '../../schedule.types'
import { VirtualRecurringSlotDetailsSheet } from './VirtualRecurringSlotDetailsSheet'

const virtualSlot: ScheduleBooking = {
  id: 'slot-recurring',
  date: '2026-09-01',
  status: 'recurring_reserved',
  startTime: '20:00',
  endTime: '21:00',
  period: 'pm',
  slotPrice: '300.00',
  recurringAnchorBookingId: 120,
  recurringContext: {
    anchor_booking_id: 120,
    customer_name: 'أحمد محمد',
    customer_phone: '+201012345678',
    recurrence_status: 'ACTIVE',
  },
}

describe('VirtualRecurringSlotDetailsSheet', () => {
  it('shows virtual occurrence identity and stop-weekly without Booking actions', async () => {
    const user = userEvent.setup()
    const onEndRecurrence = vi.fn()

    render(
      <VirtualRecurringSlotDetailsSheet
        courtName="ملعب 1"
        onClose={vi.fn()}
        onEndRecurrence={onEndRecurrence}
        slot={virtualSlot}
      />,
    )

    expect(screen.getByRole('dialog', { name: 'تفاصيل المعاد' }))
      .toBeInTheDocument()
    expect(screen.getByText('أحمد محمد')).toBeInTheDocument()
    expect(screen.getByText('+201012345678')).toBeInTheDocument()
    expect(screen.getByText('↻ محجوز أسبوعيًا')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'إيقاف الحجز الأسبوعي' }))
      .toHaveClass('bg-[var(--sloty-danger)]')
    expect(screen.queryByText('••• خيارات أخرى')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'إلغاء الحجز' }))
      .not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'سجّل العربون وأكّد الحجز' }))
      .not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'إكمال' }))
      .not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'عدم حضور' }))
      .not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'تعديل بيانات الحجز' }))
      .not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'تغيير الموعد' }))
      .not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'إيقاف الحجز الأسبوعي' }))
    expect(screen.getByRole('heading', { name: 'إيقاف الحجز الأسبوعي؟' }))
      .toBeInTheDocument()
    const confirmStop = screen
      .getAllByRole('button', { name: 'إيقاف الحجز الأسبوعي' })
      .at(-1)!
    expect(confirmStop).toHaveClass('bg-[var(--sloty-danger)]')
    await user.click(confirmStop)
    expect(onEndRecurrence).toHaveBeenCalledWith(120)
  })
})
