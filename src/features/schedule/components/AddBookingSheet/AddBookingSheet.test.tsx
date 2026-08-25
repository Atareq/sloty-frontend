import { render, screen, waitFor } from '@testing-library/react'
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

    expect(screen.getByRole('heading', { name: 'حجز جديد' }))
      .toBeInTheDocument()
    expect(screen.queryByText('حجز يدوي سريع')).not.toBeInTheDocument()
    expect(
      screen.queryByText('بعد حفظ الحجز يمكنك تسجيل دفعة أو تحرير الموعد.'),
    ).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'تأكيد الحجز' }))

    expect(
      screen.getByText('اسم العميل ورقم الهاتف مطلوبان'),
    ).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('omits recurrence controls when backend eligibility does not apply', () => {
    render(
      <AddBookingSheet
        canStartRecurring={null}
        courtName="ملعب 1"
        dateLabel="الخميس، ٢ يوليو"
        endTime="19:00"
        error={null}
        isSubmitting={false}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        startTime="18:00"
      />,
    )

    expect(
      screen.queryByRole('checkbox', { name: /ثبّت نفس الموعد كل أسبوع/ }),
    ).not.toBeInTheDocument()
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
    await user.click(screen.getByRole('button', { name: 'تأكيد الحجز' }))

    expect(onSubmit).toHaveBeenCalledWith({
      customer_name: 'أحمد علي',
      customer_phone: '+201012345678',
      notes: undefined,
    })
  })

  it('shows selected slot price as read-only context', () => {
    render(
      <AddBookingSheet
        courtName="ملعب 1"
        dateLabel="الخميس، ٢ يوليو"
        endTime="19:00"
        error={null}
        isSubmitting={false}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        slotPrice="350.00"
        startTime="18:00"
      />,
    )

    expect(screen.getByText('السعر 350.00 جنيه')).toBeInTheDocument()
    expect(screen.queryByLabelText('السعر')).not.toBeInTheDocument()
  })

  it('uses outcome-based loading copy', () => {
    render(
      <AddBookingSheet
        courtName="ملعب 1"
        dateLabel="الخميس، ٢ يوليو"
        endTime="19:00"
        error={null}
        isSubmitting
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        startTime="18:00"
      />,
    )

    expect(screen.getByRole('button', { name: 'جاري الحجز...' }))
      .toBeDisabled()
  })

  it('submits recurrence through one checkbox and one confirmation action', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)

    render(
      <AddBookingSheet
        canStartRecurring
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

    await user.click(
      screen.getByRole('checkbox', {
        name: /ثبّت نفس الموعد كل أسبوع/,
      }),
    )
    await user.type(screen.getByLabelText('اسم العميل'), 'أحمد علي')
    await user.type(screen.getByLabelText('رقم الهاتف'), '01012345678')
    await user.click(screen.getByRole('button', { name: 'تأكيد الحجز' }))

    expect(onSubmit).toHaveBeenCalledWith({
      booking_type: 'weekly',
      customer_name: 'أحمد علي',
      customer_phone: '+201012345678',
      notes: undefined,
    })
    expect(screen.queryByText('فحص الإتاحة')).not.toBeInTheDocument()
    expect(screen.queryByText('حجز مرة واحدة')).not.toBeInTheDocument()
    expect(screen.queryByText('حجز أسبوعي')).not.toBeInTheDocument()
  })

  it('explains a backend recurring conflict without offering an alternate start', () => {
    render(
      <AddBookingSheet
        canStartRecurring={false}
        courtName="ملعب 1"
        dateLabel="الخميس، ٢ يوليو"
        endTime="19:00"
        error={null}
        firstRecurringConflictStart="2026-09-08T18:00:00+03:00"
        isSubmitting={false}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        recurringBlockedReason="FUTURE_CONFLICT"
        startTime="18:00"
      />,
    )

    expect(
      screen.getByRole('checkbox', { name: /ثبّت نفس الموعد كل أسبوع/ }),
    ).toBeDisabled()
    expect(
      screen.getByText('غير متاح تثبيت الموعد لهذا الحجز.'),
    ).toBeInTheDocument()
    expect(screen.getByText(/فيه حجز آخر يوم/)).toBeInTheDocument()
    expect(screen.queryByText('FUTURE_CONFLICT')).not.toBeInTheDocument()
    expect(screen.queryByText(/ابدأ من/)).not.toBeInTheDocument()
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

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'إغلاق' })).toHaveFocus()
    })
    await user.type(screen.getByLabelText('اسم العميل'), 'أحمد علي')
    await user.type(screen.getByLabelText('رقم الهاتف'), '01012')
    await user.click(screen.getByRole('button', { name: 'تأكيد الحجز' }))

    expect(screen.getByText('رقم الهاتف غير صحيح')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('shows backend field errors for customer name and phone', () => {
    render(
      <AddBookingSheet
        courtName="ملعب 1"
        dateLabel="الخميس، ٢ يوليو"
        endTime="19:00"
        error="يرجى مراجعة البيانات المدخلة."
        fieldErrors={{
          customer_name: [
            {
              code: 'REQUIRED',
              message: 'اسم العميل مطلوب',
            },
          ],
          phone_number: [
            {
              code: 'INVALID_PHONE',
              message: 'رقم الهاتف غير صحيح من الخادم',
            },
          ],
        }}
        isSubmitting={false}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        startTime="18:00"
      />,
    )

    expect(screen.getByText('اسم العميل مطلوب')).toBeInTheDocument()
    expect(
      screen.getByText('رقم الهاتف غير صحيح من الخادم'),
    ).toBeInTheDocument()
  })

  it('protects dirty dismissal and preserves values while editing continues', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(
      <AddBookingSheet
        courtName="ملعب 1"
        dateLabel="الخميس، ٢ يوليو"
        endTime="19:00"
        error={null}
        isSubmitting={false}
        onClose={onClose}
        onSubmit={vi.fn()}
        startTime="18:00"
      />,
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'إغلاق' })).toHaveFocus()
    })
    await user.type(screen.getByLabelText('اسم العميل'), 'أحمد')
    await user.click(screen.getByRole('button', { name: 'إغلاق' }))

    expect(screen.getByText('عندك تعديلات لسه متحفظتش.')).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'كمل التعديل' }))
    expect(screen.getByLabelText('اسم العميل')).toHaveValue('أحمد')

    await user.click(screen.getByRole('button', { name: 'إغلاق' }))
    await user.click(screen.getByRole('button', { name: 'اخرج من غير حفظ' }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
