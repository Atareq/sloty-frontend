import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { SchedulePage } from './SchedulePage'

describe('SchedulePage', () => {
  it('renders the Arabic schedule header', () => {
    render(<SchedulePage />)

    expect(screen.getByText('جدول اليوم')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'نادي النصر - ملعب 1' }))
      .toBeInTheDocument()
    expect(screen.getByText('لوحة الحجز')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: '06:00 متاح' }),
    ).toBeInTheDocument()
  })

  it('does not render lifecycle-only statuses on the Booking Board', () => {
    render(<SchedulePage />)

    expect(screen.queryByText('مكتمل')).not.toBeInTheDocument()
    expect(screen.queryByText('انتظار الدفع')).not.toBeInTheDocument()
    expect(screen.queryByText('منتهي')).not.toBeInTheDocument()
    expect(screen.queryByText('لم يحضر')).not.toBeInTheDocument()
  })

  it('opens add booking placeholder from available and cancelled slots', async () => {
    const user = userEvent.setup()

    render(<SchedulePage />)

    await user.click(screen.getByRole('button', { name: '06:00 متاح' }))

    expect(screen.getByRole('heading', { name: 'إضافة حجز' }))
      .toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'إغلاق' }))
    await user.click(screen.getByRole('button', { name: '08:00 ملغي' }))

    expect(screen.getByRole('heading', { name: 'إضافة حجز' }))
      .toBeInTheDocument()
  })

  it('opens details placeholder from confirmed slots', async () => {
    const user = userEvent.setup()

    render(<SchedulePage />)

    await user.click(screen.getByRole('button', { name: '07:00 مؤكد' }))

    expect(screen.getByRole('heading', { name: 'تفاصيل الحجز' }))
      .toBeInTheDocument()
  })
})
