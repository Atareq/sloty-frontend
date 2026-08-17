import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiClientError } from '../../../../core/api/apiClient'
import { useAuth } from '../../../../core/auth/useAuth'
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

const mockedNavigate = vi.hoisted(() => vi.fn())

vi.mock('react-router', () => ({
  useNavigate: () => mockedNavigate,
}))

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
    selectedMembership: null,
    role: 'OWNER',
    isAuthenticated: true,
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
    pricing_configured: true,
    working_hours: [
      {
        weekday: 5,
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
  mockedSaveCourtWorkingHours.mockResolvedValue({
    court: 7,
    court_name: 'ملعب 1',
    pricing_configured: true,
    working_hours: [
      {
        weekday: 5,
        pricing_periods: [
          {
            starts_at: '10:00',
            ends_at: '12:00',
            price: '250.00',
          },
        ],
      },
    ],
  })
}

function renderWorkingHoursSection(canEdit = true) {
  return render(
    <CourtWorkingHoursSection
      canEdit={canEdit}
      clubSlug="nasr-club"
      courtId="7"
      isCreateMode={false}
      slotDurationMinutes={60}
    />,
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
  })
})

describe('CourtWorkingHoursSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupAuth()
    setupWorkingHoursApi()
  })

  it('does not call working-hours endpoint before a new court exists', () => {
    render(<CourtWorkingHoursSection isCreateMode />)

    expect(
      screen.getByText('يمكن ضبط فترات العمل والأسعار بعد إنشاء الملعب'),
    ).toBeInTheDocument()
    expect(mockedGetCourtWorkingHours).not.toHaveBeenCalled()
  })

  it('renders all Arabic weekdays and period-only rows', async () => {
    renderWorkingHoursSection()

    expect(await screen.findByText('السبت')).toBeInTheDocument()
    expect(screen.getByText('الأحد')).toBeInTheDocument()
    expect(screen.getByText('الاثنين')).toBeInTheDocument()
    expect(screen.getByText('الثلاثاء')).toBeInTheDocument()
    expect(screen.getByText('الأربعاء')).toBeInTheDocument()
    expect(screen.getByText('الخميس')).toBeInTheDocument()
    expect(screen.getByText('الجمعة')).toBeInTheDocument()
    expect(screen.getAllByText('فترات العمل والأسعار')).not.toHaveLength(0)
    expect(screen.queryByLabelText('السبت من')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('السبت إلى')).not.toBeInTheDocument()
    expect(screen.getByLabelText('فترة العمل 1 من')).toHaveValue('10:00')
    expect(screen.getByLabelText('فترة العمل 1 إلى')).toHaveValue('12:00')
    expect(screen.getByLabelText('فترة العمل 1 السعر')).toHaveValue(250)
    expect(screen.getAllByText('لا توجد فترات عمل لهذا اليوم.')).toHaveLength(6)
    expect(
      screen.queryByLabelText('محدد دائري لمواعيد العمل'),
    ).not.toBeInTheDocument()
  })

  it('sends all seven weekdays with closed days as empty pricing periods', async () => {
    const user = userEvent.setup()

    renderWorkingHoursSection()

    await screen.findByText('السبت')
    await user.click(screen.getByRole('button', { name: 'إغلاق اليوم' }))
    await user.click(screen.getByRole('button', { name: 'حفظ مواعيد الأسبوع' }))

    await waitFor(() => {
      expect(mockedSaveCourtWorkingHours).toHaveBeenCalled()
    })

    expect(savedPayload().working_hours).toHaveLength(7)
    expect(savedPayload().working_hours).toEqual(
      expect.arrayContaining([
        {
          weekday: 5,
          pricing_periods: [],
        },
      ]),
    )

    const serializedPayload = JSON.stringify(savedPayload())

    expect(serializedPayload).not.toContain('opens_at')
    expect(serializedPayload).not.toContain('closes_at')
    expect(serializedPayload).not.toContain('is_closed')
    expect(serializedPayload).not.toContain('blocks')
    expect(serializedPayload).not.toContain('localId')
    expect(serializedPayload).not.toContain('"id"')
  })

  it('opens a closed day with one blank editable period', async () => {
    const user = userEvent.setup()

    renderWorkingHoursSection()

    await screen.findByText('الأحد')
    await user.click(screen.getAllByRole('button', { name: 'فتح اليوم' })[0])

    expect(screen.getAllByLabelText('فترة العمل 1 من')[1]).toHaveValue('')
    expect(screen.getAllByLabelText('فترة العمل 1 إلى')[1]).toHaveValue('')
    expect(screen.getAllByLabelText('فترة العمل 1 السعر')[1]).toHaveValue(null)
  })

  it('saves period gaps as unavailable time without synthetic coverage rows', async () => {
    const user = userEvent.setup()

    renderWorkingHoursSection()

    await screen.findByText('السبت')
    fireEvent.change(screen.getByLabelText('فترة العمل 1 إلى'), {
      target: { value: '12:00' },
    })
    fireEvent.change(screen.getByLabelText('فترة العمل 1 السعر'), {
      target: { value: '200' },
    })
    await user.click(screen.getByRole('button', { name: '+ إضافة فترة' }))
    fireEvent.change(screen.getByLabelText('فترة العمل 2 من'), {
      target: { value: '17:00' },
    })
    fireEvent.change(screen.getByLabelText('فترة العمل 2 إلى'), {
      target: { value: '23:00' },
    })
    fireEvent.change(screen.getByLabelText('فترة العمل 2 السعر'), {
      target: { value: '350' },
    })
    await user.click(screen.getByRole('button', { name: 'حفظ مواعيد الأسبوع' }))

    await waitFor(() => {
      expect(mockedSaveCourtWorkingHours).toHaveBeenCalled()
    })

    expect(savedPayload().working_hours).toEqual(
      expect.arrayContaining([
        {
          weekday: 5,
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

  it('rejects overlapping periods but allows adjacent periods', async () => {
    const user = userEvent.setup()

    renderWorkingHoursSection()

    await screen.findByText('السبت')
    await user.click(screen.getByRole('button', { name: '+ إضافة فترة' }))
    fireEvent.change(screen.getByLabelText('فترة العمل 2 من'), {
      target: { value: '11:00' },
    })
    fireEvent.change(screen.getByLabelText('فترة العمل 2 إلى'), {
      target: { value: '14:00' },
    })
    fireEvent.change(screen.getByLabelText('فترة العمل 2 السعر'), {
      target: { value: '300' },
    })
    await user.click(screen.getByRole('button', { name: 'حفظ مواعيد الأسبوع' }))

    expect(
      await screen.findAllByText('لا يمكن أن تتداخل فترات العمل والأسعار.'),
    ).not.toHaveLength(0)
    expect(mockedSaveCourtWorkingHours).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText('فترة العمل 2 من'), {
      target: { value: '12:00' },
    })
    await user.click(screen.getByRole('button', { name: 'حفظ مواعيد الأسبوع' }))

    await waitFor(() => {
      expect(mockedSaveCourtWorkingHours).toHaveBeenCalledTimes(1)
    })
  })

  it('rejects missing and negative prices', async () => {
    const user = userEvent.setup()

    renderWorkingHoursSection()

    await screen.findByText('السبت')
    fireEvent.change(screen.getByLabelText('فترة العمل 1 السعر'), {
      target: { value: '' },
    })
    await user.click(screen.getByRole('button', { name: 'حفظ مواعيد الأسبوع' }))

    expect(await screen.findAllByText('السعر مطلوب')).not.toHaveLength(0)
    expect(mockedSaveCourtWorkingHours).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText('فترة العمل 1 السعر'), {
      target: { value: '-1' },
    })
    await user.click(screen.getByRole('button', { name: 'حفظ مواعيد الأسبوع' }))

    expect(await screen.findAllByText('السعر لا يمكن أن يكون أقل من صفر'))
      .not.toHaveLength(0)
  })

  it('copies Saturday periods to all days and keeps copied rows independent', async () => {
    const user = userEvent.setup()

    renderWorkingHoursSection()

    await screen.findByText('السبت')
    await user.click(screen.getByRole('button', { name: '+ إضافة فترة' }))
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
      screen.getByRole('button', { name: 'تطبيق السبت على باقي الأيام' }),
    )

    expect(screen.getAllByLabelText('فترة العمل 1 من')).toHaveLength(7)
    expect(screen.getAllByLabelText('فترة العمل 2 السعر')).toHaveLength(7)

    fireEvent.change(screen.getAllByLabelText('فترة العمل 2 السعر')[1], {
      target: { value: '450' },
    })
    expect(screen.getAllByLabelText('فترة العمل 2 السعر')[0]).toHaveValue(400)
    expect(screen.getAllByLabelText('فترة العمل 2 السعر')[1]).toHaveValue(450)
  })

  it('closes all days without inventing prices', async () => {
    const user = userEvent.setup()

    renderWorkingHoursSection()

    await screen.findByText('السبت')
    await user.click(screen.getByRole('button', { name: 'إغلاق كل الأيام' }))
    await user.click(screen.getByRole('button', { name: 'حفظ مواعيد الأسبوع' }))

    await waitFor(() => {
      expect(mockedSaveCourtWorkingHours).toHaveBeenCalled()
    })

    expect(savedPayload().working_hours).toEqual(
      weekdays.map((weekday) => ({
        weekday,
        pricing_periods: [],
      })),
    )
  })

  it('cancel changes restores the last backend-loaded draft', async () => {
    const user = userEvent.setup()

    renderWorkingHoursSection()

    await screen.findByText('السبت')
    fireEvent.change(screen.getByLabelText('فترة العمل 1 السعر'), {
      target: { value: '999' },
    })
    await user.click(screen.getByRole('button', { name: 'إلغاء التغييرات' }))

    expect(screen.getByLabelText('فترة العمل 1 السعر')).toHaveValue(250)
  })

  it('removing the final period closes that day', async () => {
    const user = userEvent.setup()

    renderWorkingHoursSection()

    await screen.findByText('السبت')
    await user.click(screen.getByRole('button', { name: 'حذف الفترة' }))

    expect(screen.getAllByText('لا توجد فترات عمل لهذا اليوم.'))
      .not.toHaveLength(0)
  })

  it('navigates to dashboard with a success flash after saving', async () => {
    const user = userEvent.setup()

    renderWorkingHoursSection()

    await screen.findByText('السبت')
    await user.click(screen.getByRole('button', { name: 'حفظ مواعيد الأسبوع' }))

    await waitFor(() => {
      expect(mockedNavigate).toHaveBeenCalledWith('/dashboard', {
        state: { flashMessage: 'تم تحديث مواعيد العمل بنجاح' },
      })
    })
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

    await screen.findByText('السبت')
    await user.click(screen.getByRole('button', { name: 'حفظ مواعيد الأسبوع' }))

    expect(await screen.findByText('فترات العمل والأسعار غير صحيحة'))
      .toBeInTheDocument()
    expect(mockedNavigate).not.toHaveBeenCalled()
  })

  it('shows 403 save error, refreshes current user, and does not retry', async () => {
    const user = userEvent.setup()

    mockedSaveCourtWorkingHours.mockRejectedValueOnce(
      new ApiClientError('ليس لديك صلاحية لهذا الإجراء.', 403),
    )

    renderWorkingHoursSection()

    await screen.findByText('السبت')
    await user.click(screen.getByRole('button', { name: 'حفظ مواعيد الأسبوع' }))

    expect(await screen.findByText('ليس لديك صلاحية لهذا الإجراء.'))
      .toBeInTheDocument()
    expect(refreshCurrentUser).toHaveBeenCalledTimes(1)
    expect(mockedSaveCourtWorkingHours).toHaveBeenCalledTimes(1)
  })
})
