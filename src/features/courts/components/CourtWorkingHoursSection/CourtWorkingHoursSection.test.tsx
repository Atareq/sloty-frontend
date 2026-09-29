import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiClientError } from '../../../../core/api/apiClient'
import { useAuth } from '../../../../core/auth/useAuth'
import { chooseAppSelectOption } from '../../../../test/appSelectTestUtils'
import {
  getCourtWorkingHours,
  saveCourtWorkingHours,
} from '../../courtWorkingHoursApi'
import {
  doPricingPeriodsOverlap,
  getWeekdayLabel,
  isTimeRangeOrdered,
  minutesToTime,
  normalizeTimeString,
  timeToMinutes,
  toApiTimeString,
  weekdays,
} from './courtWorkingHours.helpers'
import { CourtWorkingHoursSection } from './CourtWorkingHoursSection'

vi.mock('../../../../core/auth/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../../courtWorkingHoursApi', () => ({
  getCourtWorkingHours: vi.fn(),
  saveCourtWorkingHours: vi.fn(),
}))

const mockedGetCourtWorkingHours = vi.mocked(getCourtWorkingHours)
const mockedSaveCourtWorkingHours = vi.mocked(saveCourtWorkingHours)
const mockedUseAuth = vi.mocked(useAuth)
const refreshCurrentUser = vi.fn()

function setupAuth(): void {
  mockedUseAuth.mockReturnValue({
    accessToken: 'token',
    claims: { user_id: 1, role: 'OWNER' },
    currentUser: null,
    selectedClubSlug: 'nasr-club',
    accessibleClubs: [],
    accessibleCourts: [],
    selectedCourtId: null,
    selectCourt: vi.fn(),
    role: 'OWNER',
    isAuthenticated: true,
    isOperational: true,
    isLoadingSession: false,
    isTokenExpired: false,
    sessionError: null,
    login: vi.fn(),
    logout: vi.fn(),
    selectClub: vi.fn(),
    clearSelectedClub: vi.fn(),
    refreshCurrentUser,
    setTokens: vi.fn(),
  })
}

function setupWorkingHoursApi(): void {
  mockedGetCourtWorkingHours.mockResolvedValue({
    court: 7,
    court_name: 'ملعب 1',
    working_hours: [
      {
        weekday: 0,
        pricing_periods: [
          {
            id: 1,
            starts_at: '10:00:00',
            ends_at: '12:00:00',
            price: '250.00',
          },
        ],
      },
    ],
  })
  mockedSaveCourtWorkingHours.mockImplementation(
    async (_club, _courtId, payload) => ({
      court: 7,
      court_name: 'ملعب 1',
      working_hours: payload.working_hours.map((day) => ({
        weekday: day.weekday,
        pricing_periods: day.pricing_periods.map((p, idx) => ({
          id: idx + 1,
          starts_at: p.starts_at,
          ends_at: p.ends_at,
          price: p.price,
        })),
      })),
    }),
  )
}

function renderWorkingHoursSection(canEdit = true, onBack?: () => void) {
  return render(
    <MemoryRouter>
      <CourtWorkingHoursSection
        canEdit={canEdit}
        clubSlug="nasr-club"
        courtId="7"
        isCreateMode={false}
        onBack={onBack}
        slotDurationMinutes={60}
      />
    </MemoryRouter>,
  )
}

function savedPayload() {
  return mockedSaveCourtWorkingHours.mock.calls[0][2]
}

describe('CourtWorkingHoursSection helpers', () => {
  it('maps backend weekdays to Arabic labels starting from Saturday', () => {
    expect(weekdays.map((weekday) => getWeekdayLabel(weekday))).toEqual([
      'السبت',
      'الأحد',
      'الاثنين',
      'الثلاثاء',
      'الأربعاء',
      'الخميس',
      'الجمعة',
    ])
  })

  it('converts and normalizes time values', () => {
    expect(timeToMinutes('08:00')).toBe(480)
    expect(minutesToTime(480)).toBe('08:00')
    expect(normalizeTimeString('08:00:00')).toBe('08:00')
    expect(toApiTimeString('08:00')).toBe('08:00:00')
  })

  it('validates same-day period behavior while allowing adjacent periods', () => {
    expect(isTimeRangeOrdered({ starts_at: '08:00', ends_at: '12:00' }))
      .toBe(true)
    expect(isTimeRangeOrdered({ starts_at: '20:00', ends_at: '04:00' }))
      .toBe(false)
    expect(isTimeRangeOrdered({ starts_at: '08:00', ends_at: '08:00' }))
      .toBe(false)
    expect(
      doPricingPeriodsOverlap([
        { starts_at: '08:00', ends_at: '10:00', price: '100' },
        { starts_at: '09:00', ends_at: '12:00', price: '100' },
      ]),
    ).toBe(true)
    expect(
      doPricingPeriodsOverlap([
        { starts_at: '08:00', ends_at: '10:00', price: '100' },
        { starts_at: '10:00', ends_at: '12:00', price: '100' },
      ]),
    ).toBe(false)
    expect(
      doPricingPeriodsOverlap([
        { starts_at: '01:00', ends_at: '05:00', price: '200' },
        { starts_at: '05:00', ends_at: '09:00', price: '300' },
      ]),
    ).toBe(false)
  })
})

describe('CourtWorkingHoursSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Element.prototype.scrollIntoView = vi.fn()
    setupAuth()
    setupWorkingHoursApi()
  })

  it('does not call working-hours endpoint before a new court exists', () => {
    render(
      <MemoryRouter>
        <CourtWorkingHoursSection isCreateMode />
      </MemoryRouter>,
    )

    expect(
      screen.getByText('يمكن ضبط فترات العمل والأسعار بعد إنشاء الملعب'),
    ).toBeInTheDocument()
    expect(mockedGetCourtWorkingHours).not.toHaveBeenCalled()
  })

  it('renders a weekday selector and the selected day editor only', async () => {
    const user = userEvent.setup()

    renderWorkingHoursSection()

    expect(await screen.findByLabelText('اليوم')).toBeInTheDocument()
    expect(screen.getByLabelText('فترة العمل 1 من')).toHaveValue('10:00')
    expect(screen.getByLabelText('فترة العمل 1 إلى')).toHaveValue('12:00')
    expect(screen.getByLabelText('فترة العمل 1 السعر')).toHaveValue(250)
    expect(screen.queryByLabelText('فترة العمل 2 من')).not.toBeInTheDocument()
    expect(
      screen.queryByLabelText('محدد دائري لمواعيد العمل'),
    ).not.toBeInTheDocument()

    await user.click(screen.getByLabelText('اليوم'))
    expect(screen.getByRole('option', { name: 'السبت' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'الأحد' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'الاثنين' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'الثلاثاء' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'الأربعاء' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'الخميس' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'الجمعة' })).toBeInTheDocument()
  })

  it('sends all seven weekdays with closed days as empty pricing periods', async () => {
    const user = userEvent.setup()

    renderWorkingHoursSection()

    await screen.findByLabelText('اليوم')
    await user.click(screen.getByRole('button', { name: 'إغلاق اليوم' }))
    await user.click(screen.getByRole('button', { name: 'حفظ' }))

    await waitFor(() => {
      expect(mockedSaveCourtWorkingHours).toHaveBeenCalled()
    })

    expect(savedPayload().working_hours).toHaveLength(7)
    expect(savedPayload().working_hours).toEqual(
      expect.arrayContaining([
        {
          weekday: 0,
          pricing_periods: [],
        },
      ]),
    )

    const serializedPayload = JSON.stringify(savedPayload())

    expect(serializedPayload).not.toContain('opens_at')
    expect(serializedPayload).not.toContain('closes_at')
    expect(serializedPayload).not.toContain('is_closed')
    expect(serializedPayload).not.toContain('default_price')
    expect(serializedPayload).not.toContain('blocks')
    expect(serializedPayload).not.toContain('localId')
    expect(serializedPayload).not.toContain('"id"')
  })

  it('serializes weekdays with the backend Saturday-first contract', async () => {
    const user = userEvent.setup()

    renderWorkingHoursSection()

    await screen.findByLabelText('اليوم')
    for (const dayLabel of ['الأحد', 'الجمعة']) {
      await chooseAppSelectOption(user, screen.getByLabelText('اليوم'), dayLabel)
      await user.click(screen.getByRole('button', { name: 'فتح اليوم' }))
      fireEvent.change(screen.getByLabelText('فترة العمل 1 من'), {
        target: { value: '08:00' },
      })
      fireEvent.change(screen.getByLabelText('فترة العمل 1 إلى'), {
        target: { value: '09:00' },
      })
      fireEvent.change(screen.getByLabelText('فترة العمل 1 السعر'), {
        target: { value: '150' },
      })
    }
    await user.click(screen.getByRole('button', { name: 'حفظ' }))

    await waitFor(() => {
      expect(mockedSaveCourtWorkingHours).toHaveBeenCalled()
    })

    const days = savedPayload().working_hours
    const sundayFridayPeriods = [
      { starts_at: '08:00:00', ends_at: '09:00:00', price: '150' },
    ]
    expect(days.map((day) => day.weekday)).toEqual([0, 1, 2, 3, 4, 5, 6])
    expect(days[0]).toEqual({
      weekday: 0,
      pricing_periods: [
        { starts_at: '10:00:00', ends_at: '12:00:00', price: '250.00' },
      ],
    })
    expect(days[1]).toEqual({ weekday: 1, pricing_periods: sundayFridayPeriods })
    expect(days[6]).toEqual({ weekday: 6, pricing_periods: sundayFridayPeriods })
    expect(days[5]).toEqual({ weekday: 5, pricing_periods: [] })
  })

  it('opens a closed day with one blank editable period', async () => {
    const user = userEvent.setup()

    renderWorkingHoursSection()

    await screen.findByLabelText('اليوم')
    await chooseAppSelectOption(user, screen.getByLabelText('اليوم'), 'الأحد')
    await user.click(screen.getByRole('button', { name: 'فتح اليوم' }))

    expect(screen.getByLabelText('فترة العمل 1 من')).toHaveValue('')
    expect(screen.getByLabelText('فترة العمل 1 إلى')).toHaveValue('')
    expect(screen.getByLabelText('فترة العمل 1 السعر')).toHaveValue(null)
  })

  it('saves period gaps as unavailable time without synthetic coverage rows', async () => {
    const user = userEvent.setup()

    renderWorkingHoursSection()

    await screen.findByLabelText('اليوم')
    fireEvent.change(screen.getByLabelText('فترة العمل 1 إلى'), {
      target: { value: '12:00' },
    })
    fireEvent.change(screen.getByLabelText('فترة العمل 1 السعر'), {
      target: { value: '200' },
    })
    await user.click(screen.getByRole('button', { name: '+ إضافة فترة جديدة' }))
    fireEvent.change(screen.getByLabelText('فترة العمل 2 من'), {
      target: { value: '17:00' },
    })
    fireEvent.change(screen.getByLabelText('فترة العمل 2 إلى'), {
      target: { value: '23:00' },
    })
    fireEvent.change(screen.getByLabelText('فترة العمل 2 السعر'), {
      target: { value: '350' },
    })
    await user.click(screen.getByRole('button', { name: 'حفظ' }))

    await waitFor(() => {
      expect(mockedSaveCourtWorkingHours).toHaveBeenCalled()
    })

    expect(savedPayload().working_hours).toEqual(
      expect.arrayContaining([
        {
          weekday: 0,
          pricing_periods: [
            { starts_at: '10:00:00', ends_at: '12:00:00', price: '200' },
            { starts_at: '17:00:00', ends_at: '23:00:00', price: '350' },
          ],
        },
      ]),
    )
    expect(
      screen.queryByText('يجب أن تغطي فترات الأسعار كامل وقت العمل بدون فجوات'),
    ).not.toBeInTheDocument()
  })

  it('rejects overlapping periods with day-level error and allows adjacent periods', async () => {
    const user = userEvent.setup()

    renderWorkingHoursSection()

    await screen.findByLabelText('اليوم')
    await user.click(screen.getByRole('button', { name: '+ إضافة فترة جديدة' }))
    fireEvent.change(screen.getByLabelText('فترة العمل 2 من'), {
      target: { value: '11:00' },
    })
    fireEvent.change(screen.getByLabelText('فترة العمل 2 إلى'), {
      target: { value: '14:00' },
    })
    fireEvent.change(screen.getByLabelText('فترة العمل 2 السعر'), {
      target: { value: '300' },
    })
    await user.click(screen.getByRole('button', { name: 'حفظ' }))

    expect(
      await screen.findByText('حصلت مشكلة في بعض البيانات. راجع الحقول المحددة.'),
    ).toBeInTheDocument()
    expect(
      await screen.findByText('لا يمكن أن تتداخل فترات العمل والأسعار.'),
    ).toBeInTheDocument()
    expect(
      screen.queryAllByText('لا يمكن أن تتداخل فترات العمل والأسعار.'),
    ).toHaveLength(1)

    const saturdayHeading = screen.getAllByText('السبت')[1]?.closest('div')
    expect(saturdayHeading).toHaveTextContent(
      'لا يمكن أن تتداخل فترات العمل والأسعار.',
    )
    expect(mockedSaveCourtWorkingHours).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText('فترة العمل 2 من'), {
      target: { value: '12:00' },
    })
    await user.click(screen.getByRole('button', { name: 'حفظ' }))

    await waitFor(() => {
      expect(mockedSaveCourtWorkingHours).toHaveBeenCalledTimes(1)
    })
  })

  it('rejects missing and negative prices with single period-level error presentation', async () => {
    const user = userEvent.setup()

    renderWorkingHoursSection()

    await screen.findByLabelText('اليوم')
    fireEvent.change(screen.getByLabelText('فترة العمل 1 السعر'), {
      target: { value: '' },
    })
    await user.click(screen.getByRole('button', { name: 'حفظ' }))

    expect(
      await screen.findByText('حصلت مشكلة في بعض البيانات. راجع الحقول المحددة.'),
    ).toBeInTheDocument()

    expect(screen.getByText('السعر مطلوب')).toBeInTheDocument()
    expect(screen.queryAllByText('السعر مطلوب')).toHaveLength(1)

    const saturdayHeading = screen.getAllByText('السبت')[1]?.closest('div')
    expect(saturdayHeading).not.toHaveTextContent('السعر مطلوب')

    expect(mockedSaveCourtWorkingHours).not.toHaveBeenCalled()
    await waitFor(() => {
      expect(screen.getByLabelText('فترة العمل 1 السعر')).toHaveFocus()
    })

    fireEvent.change(screen.getByLabelText('فترة العمل 1 السعر'), {
      target: { value: '-1' },
    })
    await user.click(screen.getByRole('button', { name: 'حفظ' }))

    expect(
      await screen.findByText('السعر لا يمكن أن يكون أقل من صفر'),
    ).toBeInTheDocument()
    expect(
      screen.queryAllByText('السعر لا يمكن أن يكون أقل من صفر'),
    ).toHaveLength(1)
    expect(saturdayHeading).not.toHaveTextContent('السعر لا يمكن أن يكون أقل من صفر')
  })

  it('renders period validation error only on the invalid period row and does not duplicate it at the day header', async () => {
    const user = userEvent.setup()

    renderWorkingHoursSection()

    await screen.findByLabelText('اليوم')
    fireEvent.change(screen.getByLabelText('فترة العمل 1 من'), {
      target: { value: '18:00' },
    })
    fireEvent.change(screen.getByLabelText('فترة العمل 1 إلى'), {
      target: { value: '12:00' },
    })
    await user.click(screen.getByRole('button', { name: 'حفظ' }))

    expect(
      await screen.findByText('حصلت مشكلة في بعض البيانات. راجع الحقول المحددة.'),
    ).toBeInTheDocument()

    expect(
      screen.getByText('وقت نهاية فترة العمل يجب أن يكون بعد وقت البداية'),
    ).toBeInTheDocument()
    expect(
      screen.queryAllByText('وقت نهاية فترة العمل يجب أن يكون بعد وقت البداية'),
    ).toHaveLength(1)

    const saturdayHeading = screen.getAllByText('السبت')[1]?.closest('div')
    expect(saturdayHeading).not.toHaveTextContent(
      'وقت نهاية فترة العمل يجب أن يكون بعد وقت البداية',
    )

    expect(mockedSaveCourtWorkingHours).not.toHaveBeenCalled()
    await waitFor(() => {
      expect(screen.getByLabelText('فترة العمل 1 إلى')).toHaveFocus()
    })
  })

  it('saves a period ending at midnight (00:00) with proper API payload and renders guidance text', async () => {
    const user = userEvent.setup()

    renderWorkingHoursSection()

    await screen.findByLabelText('اليوم')
    fireEvent.change(screen.getByLabelText('فترة العمل 1 من'), {
      target: { value: '18:00' },
    })
    fireEvent.change(screen.getByLabelText('فترة العمل 1 إلى'), {
      target: { value: '00:00' },
    })
    fireEvent.change(screen.getByLabelText('فترة العمل 1 السعر'), {
      target: { value: '300' },
    })

    expect(screen.getByText('00:00 تعني نهاية اليوم')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'حفظ' }))

    await waitFor(() => {
      expect(mockedSaveCourtWorkingHours).toHaveBeenCalled()
    })

    expect(savedPayload().working_hours).toEqual(
      expect.arrayContaining([
        {
          weekday: 0,
          pricing_periods: [
            { starts_at: '18:00:00', ends_at: '00:00:00', price: '300' },
          ],
        },
      ]),
    )

    const serializedPayload = JSON.stringify(savedPayload())
    expect(serializedPayload).not.toContain('24:00')
    expect(serializedPayload).not.toContain('23:59')
  })

  it('renders midnight guidance text only under the "إلى" input when ends_at is 00:00', async () => {
    renderWorkingHoursSection()

    await screen.findByLabelText('اليوم')
    expect(screen.queryByText('00:00 تعني نهاية اليوم')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('فترة العمل 1 من'), {
      target: { value: '00:00' },
    })
    expect(screen.queryByText('00:00 تعني نهاية اليوم')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('فترة العمل 1 إلى'), {
      target: { value: '00:00' },
    })
    expect(screen.getByText('00:00 تعني نهاية اليوم')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('فترة العمل 1 إلى'), {
      target: { value: '23:00' },
    })
    expect(screen.queryByText('00:00 تعني نهاية اليوم')).not.toBeInTheDocument()
  })

  it('switches to the first invalid weekday and focuses its field after a failed save', async () => {
    const user = userEvent.setup()
    Element.prototype.scrollIntoView = vi.fn()

    renderWorkingHoursSection()

    await screen.findByLabelText('اليوم')
    await chooseAppSelectOption(user, screen.getByLabelText('اليوم'), 'الأحد')
    await user.click(screen.getByRole('button', { name: 'فتح اليوم' }))
    fireEvent.change(screen.getByLabelText('فترة العمل 1 من'), {
      target: { value: '10:00' },
    })
    fireEvent.change(screen.getByLabelText('فترة العمل 1 إلى'), {
      target: { value: '12:00' },
    })
    await chooseAppSelectOption(user, screen.getByLabelText('اليوم'), 'السبت')
    await user.click(screen.getByRole('button', { name: 'حفظ' }))

    expect(
      await screen.findByText('حصلت مشكلة في بعض البيانات. راجع الحقول المحددة.'),
    ).toBeInTheDocument()
    expect(screen.getAllByText('السعر مطلوب').length).toBeGreaterThan(0)
    await waitFor(() => {
      expect(screen.getByLabelText('فترة العمل 1 السعر')).toHaveFocus()
    })
    expect(mockedSaveCourtWorkingHours).not.toHaveBeenCalled()
  })

  it('copies Saturday periods to all days, keeps copied rows independent, and shows inline completion badge', async () => {
    const user = userEvent.setup()

    renderWorkingHoursSection()

    await screen.findByLabelText('اليوم')
    expect(
      screen.getByText(
        'اختار اليوم، وبعدها حدد الفترات اللي الملعب بيكون متاح فيها للحجز.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', {
        name: 'نسخ مواعيد السبت لباقي أيام الأسبوع',
      }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'إغلاق كل الأيام' }),
    ).not.toBeInTheDocument()

    // Badge must not appear before the action is triggered
    expect(
      screen.queryByText('تم التطبيق على باقي أيام الأسبوع'),
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '+ إضافة فترة جديدة' }))
    fireEvent.change(screen.getByLabelText('فترة العمل 2 من'), {
      target: { value: '18:00' },
    })
    fireEvent.change(screen.getByLabelText('فترة العمل 2 إلى'), {
      target: { value: '20:00' },
    })
    fireEvent.change(screen.getByLabelText('فترة العمل 2 السعر'), {
      target: { value: '400' },
    })
    await user.click(
      screen.getByRole('button', {
        name: /حفظ وتطبيق مواعيد السبت على باقي الأسبوع/,
      }),
    )

    expect(await screen.findByText('تم الحفظ والتطبيق بنجاح')).toBeInTheDocument()
    await waitFor(() => {
      expect(mockedSaveCourtWorkingHours).toHaveBeenCalled()
    })

    // Inline completion badge must appear after successful apply
    expect(
      screen.getByText('تم التطبيق على باقي أيام الأسبوع'),
    ).toBeInTheDocument()

    await chooseAppSelectOption(user, screen.getByLabelText('اليوم'), 'الأحد')
    expect(screen.getByLabelText('فترة العمل 1 من')).toHaveValue('10:00')
    expect(screen.getByLabelText('فترة العمل 2 السعر')).toHaveValue(400)

    fireEvent.change(screen.getByLabelText('فترة العمل 2 السعر'), {
      target: { value: '450' },
    })
    expect(screen.getByLabelText('فترة العمل 2 السعر')).toHaveValue(450)

    // Badge must disappear after any edit
    expect(
      screen.queryByText('تم التطبيق على باقي أيام الأسبوع'),
    ).not.toBeInTheDocument()

    await chooseAppSelectOption(user, screen.getByLabelText('اليوم'), 'السبت')
    expect(screen.getByLabelText('فترة العمل 2 السعر')).toHaveValue(400)
  })

  it('does not render "إغلاق كل الأيام" and renders save-and-apply action block', async () => {
    renderWorkingHoursSection()

    await screen.findByLabelText('اليوم')
    expect(
      screen.getByText(
        'اختار اليوم، وبعدها حدد الفترات اللي الملعب بيكون متاح فيها للحجز.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'إغلاق كل الأيام' }),
    ).not.toBeInTheDocument()
    expect(screen.queryByText('إغلاق كل الأيام')).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: /حفظ وتطبيق مواعيد السبت على باقي الأسبوع/,
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'يحفظ التعديلات الحالية ويطبق نفس الفترات والأسعار على الأيام الأخرى',
      ),
    ).toBeInTheDocument()
    expect(
      screen.queryByText('تطبيق نفس الفترات والأسعار على باقي أيام الأسبوع الستة'),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', {
        name: 'تطبيق مواعيد السبت',
      }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', {
        name: 'نسخ مواعيد السبت لباقي أيام الأسبوع',
      }),
    ).not.toBeInTheDocument()
  })

  it('navigates back when clicking the back button', async () => {
    const user = userEvent.setup()
    const onBack = vi.fn()

    renderWorkingHoursSection(true, onBack)

    await screen.findByLabelText('اليوم')
    await user.click(screen.getByRole('button', { name: 'رجوع' }))

    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('removing the final period closes that day', async () => {
    const user = userEvent.setup()

    renderWorkingHoursSection()

    await screen.findByLabelText('اليوم')
    await user.click(screen.getByRole('button', { name: 'حذف الفترة' }))

    expect(screen.getAllByText('لا توجد فترات عمل لهذا اليوم.'))
      .not.toHaveLength(0)
  })

  it('stays on the page with a success message after saving', async () => {
    const user = userEvent.setup()

    renderWorkingHoursSection()

    await screen.findByLabelText('اليوم')
    await user.click(screen.getByRole('button', { name: 'حفظ' }))

    expect(await screen.findByText('تم الحفظ بنجاح')).toBeInTheDocument()
  })

  it('shows backend working-hours field error when save fails', async () => {
    const user = userEvent.setup()

    mockedSaveCourtWorkingHours.mockRejectedValueOnce(
      new ApiClientError('يرجى مراجعة مواعيد العمل', 400, {
        code: 'VALIDATION_ERROR',
        fieldErrors: {
          pricing_periods: [
            {
              code: 'INVALID_PRICING',
              message: 'فترات العمل والأسعار غير صحيحة',
            },
          ],
        },
      }),
    )

    renderWorkingHoursSection()

    await screen.findByLabelText('اليوم')
    await user.click(screen.getByRole('button', { name: 'حفظ' }))

    expect(await screen.findByText('فترات العمل والأسعار غير صحيحة'))
      .toBeInTheDocument()
    expect(mockedGetCourtWorkingHours).toHaveBeenCalled()
  })

  it('shows 403 save error, refreshes current user, and does not retry', async () => {
    const user = userEvent.setup()

    mockedSaveCourtWorkingHours.mockRejectedValueOnce(
      new ApiClientError('ليس لديك صلاحية لهذا الإجراء.', 403),
    )

    renderWorkingHoursSection()

    await screen.findByLabelText('اليوم')
    await user.click(screen.getByRole('button', { name: 'حفظ' }))

    expect(await screen.findByText('ليس لديك صلاحية لهذا الإجراء.'))
      .toBeInTheDocument()
    expect(refreshCurrentUser).toHaveBeenCalledTimes(1)
    expect(mockedSaveCourtWorkingHours).toHaveBeenCalledTimes(1)
  })

  it('applies primary green surface style to selected day tab and secondary style to unselected tabs', async () => {
    renderWorkingHoursSection()

    await screen.findByLabelText('اليوم')

    const saturdayTab = screen.getByRole('tab', { name: 'السبت' })
    const sundayTab = screen.getByRole('tab', { name: 'الأحد' })

    expect(saturdayTab).toHaveClass('sloty-green-surface-button')
    expect(sundayTab).not.toHaveClass('sloty-green-surface-button')
  })

  it('verifies complete removal of obsolete pricing fields and old action buttons', async () => {
    renderWorkingHoursSection()

    await screen.findByLabelText('اليوم')

    expect(screen.queryByText('pricing_configured')).not.toBeInTheDocument()
    expect(screen.queryByText('minimum_slot_price')).not.toBeInTheDocument()
    expect(screen.queryByText('maximum_slot_price')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'إلغاء التغييرات' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'حفظ مواعيد الأسبوع' })).not.toBeInTheDocument()
  })

  it('renders 7-day segmented strip and allows switching days via tab pills', async () => {
    const user = userEvent.setup()

    renderWorkingHoursSection()

    await screen.findByLabelText('اليوم')

    const tablist = screen.getByRole('tablist', { name: 'أيام الأسبوع' })
    expect(tablist).toBeInTheDocument()

    // Sunday tab
    const sundayTab = screen.getByRole('tab', { name: 'الأحد' })
    expect(sundayTab).toBeInTheDocument()
    expect(sundayTab).toHaveTextContent('أحد')
    expect(sundayTab).toHaveAttribute('aria-selected', 'false')

    // Click Sunday tab
    await user.click(sundayTab)

    expect(sundayTab).toHaveAttribute('aria-selected', 'true')
    // Selected day is Sunday (closed)
    expect(screen.getByRole('button', { name: 'فتح اليوم' })).toBeInTheDocument()
    expect(screen.getAllByText('مغلق').length).toBeGreaterThan(0)

    // Saturday tab
    const saturdayTab = screen.getByRole('tab', { name: 'السبت' })
    expect(saturdayTab).toHaveTextContent('سبت')
    await user.click(saturdayTab)

    expect(saturdayTab).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('button', { name: 'إغلاق اليوم' })).toBeInTheDocument()
    expect(screen.getAllByText('مفتوح').length).toBeGreaterThan(0)
  })

  it('renders period cards with formatted time and price summary badges', async () => {
    renderWorkingHoursSection()

    await screen.findByLabelText('اليوم')

    // Period 1 is 10:00 - 12:00 at 250.00 EGP
    expect(screen.getByText('فترة 1')).toBeInTheDocument()
    expect(
      screen.getByText('من 10:00 ص إلى 12:00 م · 250.00 ج.م'),
    ).toBeInTheDocument()
  })

  it('renders the entire save-and-apply block as a clickable button beside the back button', async () => {
    const user = userEvent.setup()
    const onBack = vi.fn()

    renderWorkingHoursSection(true, onBack)

    await screen.findByLabelText('اليوم')

    // Verify dynamic day text when Saturday is selected
    const saveAndApplyButton = screen.getByRole('button', {
      name: /حفظ وتطبيق مواعيد السبت على باقي الأسبوع/,
    })
    expect(saveAndApplyButton).toBeInTheDocument()
    expect(saveAndApplyButton).toHaveAttribute('type', 'button')
    expect(saveAndApplyButton).toHaveTextContent(
      'يحفظ التعديلات الحالية ويطبق نفس الفترات والأسعار على الأيام الأخرى',
    )

    // Verify back button is beside it
    const backButton = screen.getByRole('button', { name: 'رجوع' })
    expect(backButton).toBeInTheDocument()
    expect(saveAndApplyButton.parentElement).toContainElement(backButton)

    // Switch day to Sunday and verify dynamic label updates
    await user.click(screen.getByRole('tab', { name: 'الأحد' }))
    expect(
      screen.getByRole('button', {
        name: /حفظ وتطبيق مواعيد الأحد على باقي الأسبوع/,
      }),
    ).toBeInTheDocument()

    // Clicking anywhere on the block triggers save and apply
    await user.click(
      screen.getByRole('button', {
        name: /حفظ وتطبيق مواعيد الأحد على باقي الأسبوع/,
      }),
    )

    expect(await screen.findByText('تم الحفظ والتطبيق بنجاح')).toBeInTheDocument()
    expect(mockedSaveCourtWorkingHours).toHaveBeenCalled()

    // Clicking back triggers onBack
    await user.click(backButton)
    expect(onBack).toHaveBeenCalledTimes(1)
  })
})
