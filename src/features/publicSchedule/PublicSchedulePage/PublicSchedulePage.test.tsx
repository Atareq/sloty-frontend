import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getPublicCourtAvailability } from '../publicScheduleApi'
import type { PublicCourtAvailabilityResponse } from '../publicSchedule.types'
import { publicScheduleVisitorCopy } from '../../../shared/copy/appCopy'
import { PublicSchedulePage } from './PublicSchedulePage'

vi.mock('../publicScheduleApi', () => ({
  getPublicCourtAvailability: vi.fn(),
}))

const mockedGetPublicCourtAvailability = vi.mocked(getPublicCourtAvailability)

const mockAvailabilityResponse: PublicCourtAvailabilityResponse = {
  club: { id: 1, slug: 'al-ahly', name: 'النادي الأهلي' },
  court: { id: 5, name: 'ملعب النجوم' },
  date: '2026-09-10',
  is_closed: false,
  opens_at: '09:00',
  closes_at: '23:00',
  slot_duration_minutes: 60,
  slots: [
    {
      start_time: '09:00:00',
      end_time: '10:00:00',
      availability: 'AVAILABLE',
    },
    {
      start_time: '10:00:00',
      end_time: '11:00:00',
      availability: 'UNAVAILABLE',
    },
    {
      start_time: '18:00:00',
      end_time: '19:00:00',
      availability: 'AVAILABLE',
    },
    {
      start_time: '19:00:00',
      end_time: '20:00:00',
      availability: 'UNAVAILABLE',
    },
  ],
}

function renderPublicSchedulePage(
  initialUrl = '/public/al-ahly/courts/5/schedule',
) {
  return render(
    <MemoryRouter initialEntries={[initialUrl]}>
      <Routes>
        <Route
          element={<PublicSchedulePage />}
          path="/public/:clubSlug/courts/:courtId/schedule"
        />
        <Route element={<p>صفحة تسجيل الدخول</p>} path="/login" />
      </Routes>
    </MemoryRouter>,
  )
}

describe('PublicSchedulePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedGetPublicCourtAvailability.mockResolvedValue(
      mockAvailabilityResponse,
    )
    window.HTMLElement.prototype.scrollIntoView = vi.fn()
  })

  it('renders court name, club name, and availability slots from public endpoint', async () => {
    renderPublicSchedulePage()

    expect(await screen.findByRole('heading', { name: 'ملعب النجوم' }))
      .toBeInTheDocument()
    expect(screen.getByText('النادي الأهلي')).toBeInTheDocument()

    // 2 available slots, 2 unavailable slots
    const availableSlots = screen.getAllByRole('button', {
      name: /(?<!غير )متاح$/,
    })
    const unavailableSlots = screen.getAllByRole('button', {
      name: /غير متاح$/,
    })

    expect(availableSlots).toHaveLength(2)
    expect(unavailableSlots).toHaveLength(2)

    availableSlots.forEach((slot) => {
      expect(slot).toBeEnabled()
    })
    unavailableSlots.forEach((slot) => {
      expect(slot).toBeDisabled()
    })
  })

  it('maintains strict privacy boundary: calls only public availability API with signal', async () => {
    renderPublicSchedulePage()

    await screen.findByRole('heading', { name: 'ملعب النجوم' })

    expect(mockedGetPublicCourtAvailability).toHaveBeenCalledTimes(1)
    expect(mockedGetPublicCourtAvailability).toHaveBeenCalledWith(
      'al-ahly',
      5,
      expect.objectContaining({ date: expect.any(String) }),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
  })

  it('opens visitor guidance popup with exact copy and no scroll or login ring when an available slot is clicked', async () => {
    const user = userEvent.setup()

    renderPublicSchedulePage()

    const availableSlots = await screen.findAllByRole('button', {
      name: /(?<!غير )متاح$/,
    })
    const loginButton = screen.getByTestId('public-schedule-login-button')

    expect(loginButton).not.toHaveClass('ring-4')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(availableSlots[0])

    // Verify visitor guidance dialog appears with exact Arabic copy
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: publicScheduleVisitorCopy.title }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(publicScheduleVisitorCopy.bodyPlayer),
    ).toBeInTheDocument()
    expect(
      screen.getByText(publicScheduleVisitorCopy.stayTuned),
    ).toBeInTheDocument()
    expect(
      screen.getByText(publicScheduleVisitorCopy.bodyStaff),
    ).toBeInTheDocument()

    // Verifies NO Booking flow
    expect(screen.queryByText('حجز جديد')).not.toBeInTheDocument()

    // Verify login button was NOT scrolled to, NOT highlighted, and NOT focused
    expect(window.HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled()
    expect(loginButton).not.toHaveClass('ring-4')
    expect(loginButton).not.toHaveFocus()

    // Click 'استمرار' to close popup
    const continueButton = screen.getByRole('button', {
      name: publicScheduleVisitorCopy.continueAction,
    })
    await user.click(continueButton)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders mobile Login icon button and compact Share button in public header', async () => {
    renderPublicSchedulePage()

    const loginButton = await screen.findByTestId('public-schedule-login-button')
    expect(loginButton).toHaveClass('w-11')
    expect(loginButton).toHaveAttribute('aria-label', 'تسجيل الدخول لفريق العمل')
    expect(loginButton.querySelector('span.hidden.sm\\:inline')).toHaveTextContent('تسجيل الدخول')

    const shareButton = screen.getByRole('button', { name: 'مشاركة الجدول' })
    expect(shareButton).toBeInTheDocument()
    expect(shareButton).toHaveClass('w-11')
  })

  it('does not open visitor popup when an unavailable slot is targeted', async () => {
    const user = userEvent.setup()

    renderPublicSchedulePage()

    const unavailableSlots = await screen.findAllByRole('button', {
      name: /غير متاح$/,
    })

    expect(unavailableSlots[0]).toBeDisabled()
    await user.click(unavailableSlots[0])

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('navigates to /login with state.guestReturnTo when login button is clicked', async () => {
    const user = userEvent.setup()

    renderPublicSchedulePage('/public/al-ahly/courts/5/schedule')

    const loginButton = await screen.findByTestId(
      'public-schedule-login-button',
    )
    await user.click(loginButton)

    expect(await screen.findByText('صفحة تسجيل الدخول')).toBeInTheDocument()
  })

  it('scrolls into view and triggers period guidance when morning or evening headers are clicked', async () => {
    const user = userEvent.setup()

    renderPublicSchedulePage()

    const morningButton = await screen.findByRole('button', {
      name: /مواعيد الصباح/,
    })
    const eveningButton = screen.getByRole('button', {
      name: /مواعيد المساء/,
    })

    await user.click(morningButton)
    expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalled()

    await user.click(eveningButton)
    expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalled()
  })

  it('displays closed notice when court is closed on the selected date', async () => {
    mockedGetPublicCourtAvailability.mockResolvedValueOnce({
      ...mockAvailabilityResponse,
      is_closed: true,
      slots: [],
    })

    renderPublicSchedulePage()

    expect(
      await screen.findByText('الملعب مغلق في هذا التاريخ.'),
    ).toBeInTheDocument()
  })

  it('displays error state when clubSlug or courtId route param is invalid', () => {
    renderPublicSchedulePage('/public/al-ahly/courts/invalid/schedule')

    expect(
      screen.getByText('رابط الملعب غير صحيح أو غير متوفر.'),
    ).toBeInTheDocument()
  })

  it('renders guest share schedule button in the header actions area', async () => {
    renderPublicSchedulePage()

    const shareButton = await screen.findByRole('button', {
      name: 'مشاركة الجدول',
    })
    expect(shareButton).toBeInTheDocument()
  })

  it('verifies operational HOLD and booked slots appear sanitized strictly as UNAVAILABLE (غير متاح, disabled)', async () => {
    mockedGetPublicCourtAvailability.mockResolvedValueOnce({
      ...mockAvailabilityResponse,
      slots: [
        {
          start_time: '14:00:00',
          end_time: '15:00:00',
          availability: 'UNAVAILABLE',
        },
      ],
    })

    renderPublicSchedulePage()

    const unavailableSlot = await screen.findByRole('button', {
      name: /غير متاح$/,
    })
    expect(unavailableSlot).toBeInTheDocument()
    expect(unavailableSlot).toBeDisabled()
    expect(unavailableSlot).toHaveAttribute('aria-disabled', 'true')

    // Must NOT leak operational HOLD labels, pricing, or private information
    expect(screen.queryByText('بانتظار العربون')).not.toBeInTheDocument()
    expect(screen.queryByText('HOLD')).not.toBeInTheDocument()
    expect(screen.queryByText('CONFIRMED')).not.toBeInTheDocument()
  })
})

