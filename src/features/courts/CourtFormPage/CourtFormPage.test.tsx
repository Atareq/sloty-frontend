import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { createCourt } from '../courtsApi'
import { CourtFormPage } from './CourtFormPage'

vi.mock('../courtsApi', () => ({
  createCourt: vi.fn(),
  getCourt: vi.fn(),
  updateCourt: vi.fn(),
}))

vi.mock('../components/CourtWorkingHoursSection/CourtWorkingHoursSection', () => ({
  CourtWorkingHoursSection: () => null,
}))

const mockedCreateCourt = vi.mocked(createCourt)

describe('CourtFormPage', () => {
  it('uses human policy wording while preserving backend payload fields', async () => {
    const user = userEvent.setup()

    mockedCreateCourt.mockResolvedValue({
      id: 7,
      club: 1,
      name: 'ملعب النخيل',
      sport_type: 'FOOTBALL',
      default_price: '300',
      minimum_deposit: '100',
      cancellation_refund_notice_days: 3,
      slot_duration_minutes: 60,
      is_active: true,
      requires_digital_payment_reference: false,
      internal_hold_expiry_hours: 12,
    })

    render(
      <MemoryRouter initialEntries={['/admin/clubs/nasr/courts/new']}>
        <Routes>
          <Route
            element={<CourtFormPage />}
            path="/admin/clubs/:clubSlug/courts/new"
          />
          <Route element={<p>تم الحفظ</p>} path="/admin/clubs/:clubSlug/courts" />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('مدة انتظار الحجز بدون العربون')).toBeInTheDocument()
    expect(
      screen.getByText(
        'لو العربون متدفعش خلال المدة دي، الحجز هيتلغي تلقائيًا.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('سياسة استرداد التأمين')).toBeInTheDocument()
    expect(screen.queryByText('internal_hold_expiry_hours')).not.toBeInTheDocument()

    await user.type(screen.getByLabelText('اسم الملعب'), 'ملعب النخيل')
    await user.type(screen.getByLabelText('سعر الفترة الواحده'), '300')
    await user.type(screen.getByLabelText(/الحد الأدنى للعربون/), '100')
    await user.type(screen.getByLabelText(/سياسة استرداد التأمين/), '3')
    await user.click(screen.getByRole('button', { name: 'حفظ الملعب' }))

    await waitFor(() => {
      expect(mockedCreateCourt).toHaveBeenCalledWith(
        'nasr',
        expect.objectContaining({
          internal_hold_expiry_hours: 12,
          cancellation_refund_notice_days: 3,
        }),
      )
    })
  })
})
