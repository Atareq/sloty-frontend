import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AddBookingSheet } from './AddBookingSheet'

describe('AddBookingSheet', () => {
  it('requires customer name and phone before submit', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(
      <AddBookingSheet
        courtName="ملعب 1"
        dateLabel="الخميس، ٢ يوليو"
        endTime="19:00"
        error={null}
        isSubmitting={false}
        onClose={vi.fn()}
        onSubmit={onSubmit}
        startTime="18:00"
      />,
    )

    await user.click(screen.getByRole('button', { name: 'حفظ الحجز' }))

    expect(
      screen.getByText('اسم العميل ورقم الهاتف مطلوبان'),
    ).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits trimmed customer fields and omits empty notes', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)

    render(
      <AddBookingSheet
        courtName="ملعب 1"
        dateLabel="الخميس، ٢ يوليو"
        endTime="19:00"
        error={null}
        isSubmitting={false}
        onClose={vi.fn()}
        onSubmit={onSubmit}
        startTime="18:00"
      />,
    )

    await user.type(screen.getByLabelText('اسم العميل'), '  أحمد علي  ')
    await user.type(screen.getByLabelText('رقم الهاتف'), '01012345678')
    await user.click(screen.getByRole('button', { name: 'حفظ الحجز' }))

    expect(onSubmit).toHaveBeenCalledWith({
      customer_name: 'أحمد علي',
      customer_phone: '+201012345678',
      notes: undefined,
    })
  })

  it('blocks invalid phone numbers', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(
      <AddBookingSheet
        courtName="ملعب 1"
        dateLabel="الخميس، ٢ يوليو"
        endTime="19:00"
        error={null}
        isSubmitting={false}
        onClose={vi.fn()}
        onSubmit={onSubmit}
        startTime="18:00"
      />,
    )

    await user.type(screen.getByLabelText('اسم العميل'), 'أحمد علي')
    await user.type(screen.getByLabelText('رقم الهاتف'), '01012')
    await user.click(screen.getByRole('button', { name: 'حفظ الحجز' }))

    expect(screen.getByText('رقم الهاتف غير صحيح')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
