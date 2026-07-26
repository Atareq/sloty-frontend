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
  doBlocksOverlap,
  getWeekdayLabel,
  isSameDayValidBlock,
  minutesToTime,
  normalizeTimeString,
  timeToMinutes,
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
  })

  it('validates same-day blocks and overlap behavior', () => {
    expect(isSameDayValidBlock({ start_time: '08:00', end_time: '12:00' }))
      .toBe(true)
    expect(isSameDayValidBlock({ start_time: '20:00', end_time: '04:00' }))
      .toBe(false)
    expect(isSameDayValidBlock({ start_time: '08:00', end_time: '08:00' }))
      .toBe(false)
    expect(
      doBlocksOverlap([
        { start_time: '08:00', end_time: '10:00' },
        { start_time: '09:00', end_time: '12:00' },
      ]),
    ).toBe(true)
    expect(
      doBlocksOverlap([
        { start_time: '08:00', end_time: '10:00' },
        { start_time: '10:00', end_time: '12:00' },
      ]),
    ).toBe(false)
  })
})

describe('CourtWorkingHoursSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
    mockedGetCourtWorkingHours.mockResolvedValue({
      court: 7,
      court_name: 'ملعب 1',
      working_hours: [
        {
          id: 1,
          weekday: 5,
          is_closed: false,
          blocks: [
            {
              id: 1,
              start_time: '10:00:00',
              end_time: '12:00:00',
            },
          ],
        },
      ],
    })
    mockedSaveCourtWorkingHours.mockResolvedValue({
      court: 7,
      court_name: 'ملعب 1',
      working_hours: [
        {
          weekday: 5,
          is_closed: false,
          blocks: [
            {
              start_time: '10:00',
              end_time: '12:00',
            },
          ],
        },
      ],
    })
  })

  it('does not call working-hours endpoint before a new court exists', () => {
    render(<CourtWorkingHoursSection isCreateMode />)

    expect(
      screen.getByText('يمكن ضبط مواعيد العمل بعد إنشاء الملعب'),
    ).toBeInTheDocument()
    expect(mockedGetCourtWorkingHours).not.toHaveBeenCalled()
  })

  it('renders all Arabic weekday labels and native time inputs', async () => {
    render(
      <CourtWorkingHoursSection
        clubSlug="nasr-club"
        courtId="7"
        isCreateMode={false}
      />,
    )

    expect(await screen.findByText('السبت')).toBeInTheDocument()
    expect(screen.getByText('الأحد')).toBeInTheDocument()
    expect(screen.getByText('الاثنين')).toBeInTheDocument()
    expect(screen.getByText('الثلاثاء')).toBeInTheDocument()
    expect(screen.getByText('الأربعاء')).toBeInTheDocument()
    expect(screen.getByText('الخميس')).toBeInTheDocument()
    expect(screen.getByText('الجمعة')).toBeInTheDocument()
    expect(screen.getByLabelText('السبت من')).toHaveValue('10:00')
    expect(screen.getByLabelText('السبت إلى')).toHaveValue('12:00')
    expect(
      screen.queryByLabelText('محدد دائري لمواعيد العمل'),
    ).not.toBeInTheDocument()
  })

  it('sends closed days with empty blocks', async () => {
    const user = userEvent.setup()

    render(
      <CourtWorkingHoursSection
        clubSlug="nasr-club"
        courtId="7"
        isCreateMode={false}
      />,
    )

    await screen.findByText('السبت')
    await user.click(screen.getAllByRole('button', { name: 'مغلق' })[0])
    await user.click(screen.getByRole('button', { name: 'حفظ مواعيد الأسبوع' }))

    await waitFor(() => {
      expect(mockedSaveCourtWorkingHours).toHaveBeenCalledWith('nasr-club', 7, {
        working_hours: expect.arrayContaining([
          {
            weekday: 5,
            is_closed: true,
            blocks: [],
          },
        ]),
      })
    })

    const payload = mockedSaveCourtWorkingHours.mock.calls[0][2]
    expect(JSON.stringify(payload)).not.toContain('opens_at')
    expect(JSON.stringify(payload)).not.toContain('closes_at')
    expect(JSON.stringify(payload)).not.toContain('end_day_offset')
  })

  it('requires at least one block for open days', async () => {
    const user = userEvent.setup()

    render(
      <CourtWorkingHoursSection
        clubSlug="nasr-club"
        courtId="7"
        isCreateMode={false}
      />,
    )

    await screen.findByText('السبت')
    await user.click(screen.getAllByRole('button', { name: 'حذف الفترة' })[0])
    await user.click(screen.getByRole('button', { name: 'حفظ مواعيد الأسبوع' }))

    expect(await screen.findAllByText('أضف فترة عمل واحدة على الأقل')).not
      .toHaveLength(0)
    expect(mockedSaveCourtWorkingHours).not.toHaveBeenCalled()
  })

  it('saves two non-overlapping periods as blocks', async () => {
    const user = userEvent.setup()

    render(
      <CourtWorkingHoursSection
        clubSlug="nasr-club"
        courtId="7"
        isCreateMode={false}
      />,
    )

    await screen.findByText('السبت')
    await user.click(screen.getAllByRole('button', { name: 'إضافة فترة' })[0])
    const startInputs = screen.getAllByLabelText('السبت من')
    const endInputs = screen.getAllByLabelText('السبت إلى')

    fireEvent.change(startInputs[1], { target: { value: '16:00' } })
    fireEvent.change(endInputs[1], { target: { value: '18:00' } })
    await user.click(screen.getByRole('button', { name: 'حفظ مواعيد الأسبوع' }))

    await waitFor(() => {
      expect(mockedSaveCourtWorkingHours).toHaveBeenCalledWith('nasr-club', 7, {
        working_hours: expect.arrayContaining([
          {
            weekday: 5,
            is_closed: false,
            blocks: [
              { start_time: '10:00', end_time: '12:00' },
              { start_time: '16:00', end_time: '18:00' },
            ],
          },
        ]),
      })
    })
  })

  it('navigates to dashboard with a success flash after saving', async () => {
    const user = userEvent.setup()

    render(
      <CourtWorkingHoursSection
        clubSlug="nasr-club"
        courtId="7"
        isCreateMode={false}
      />,
    )

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
          working_hours: [
            {
              code: 'INVALID_BLOCKS',
              message: 'فترات العمل غير صحيحة',
            },
          ],
        },
      }),
    )

    render(
      <CourtWorkingHoursSection
        clubSlug="nasr-club"
        courtId="7"
        isCreateMode={false}
      />,
    )

    await screen.findByText('السبت')
    await user.click(screen.getByRole('button', { name: 'حفظ مواعيد الأسبوع' }))

    expect(await screen.findByText('فترات العمل غير صحيحة'))
      .toBeInTheDocument()
    expect(mockedNavigate).not.toHaveBeenCalled()
  })

  it('shows 403 save error, refreshes current user, and does not retry', async () => {
    const user = userEvent.setup()

    mockedSaveCourtWorkingHours.mockRejectedValueOnce(
      new ApiClientError('ليس لديك صلاحية لهذا الإجراء.', 403),
    )

    render(
      <CourtWorkingHoursSection
        clubSlug="nasr-club"
        courtId="7"
        isCreateMode={false}
      />,
    )

    await screen.findByText('السبت')
    await user.click(screen.getByRole('button', { name: 'حفظ مواعيد الأسبوع' }))

    expect(await screen.findByText('ليس لديك صلاحية لهذا الإجراء.'))
      .toBeInTheDocument()
    expect(refreshCurrentUser).toHaveBeenCalledTimes(1)
    expect(mockedSaveCourtWorkingHours).toHaveBeenCalledTimes(1)
  })

  it('rejects overlapping periods', async () => {
    const user = userEvent.setup()

    render(
      <CourtWorkingHoursSection
        clubSlug="nasr-club"
        courtId="7"
        isCreateMode={false}
      />,
    )

    await screen.findByText('السبت')
    await user.click(screen.getAllByRole('button', { name: 'إضافة فترة' })[0])
    fireEvent.change(screen.getAllByLabelText('السبت من')[1], {
      target: { value: '11:00' },
    })
    fireEvent.change(screen.getAllByLabelText('السبت إلى')[1], {
      target: { value: '13:00' },
    })
    await user.click(screen.getByRole('button', { name: 'حفظ مواعيد الأسبوع' }))

    expect(await screen.findAllByText('لا يمكن تداخل فترات العمل في نفس اليوم'))
      .not.toHaveLength(0)
    expect(mockedSaveCourtWorkingHours).not.toHaveBeenCalled()
  })

  it('rejects overnight periods', async () => {
    const user = userEvent.setup()

    render(
      <CourtWorkingHoursSection
        clubSlug="nasr-club"
        courtId="7"
        isCreateMode={false}
      />,
    )

    await screen.findByText('السبت')
    await user.clear(screen.getByLabelText('السبت من'))
    await user.type(screen.getByLabelText('السبت من'), '20:00')
    await user.clear(screen.getByLabelText('السبت إلى'))
    await user.type(screen.getByLabelText('السبت إلى'), '04:00')
    await user.click(screen.getByRole('button', { name: 'حفظ مواعيد الأسبوع' }))

    expect(
      await screen.findAllByText(
        'وقت النهاية يجب أن يكون بعد وقت البداية في نفس اليوم',
      ),
    ).not.toHaveLength(0)
    expect(mockedSaveCourtWorkingHours).not.toHaveBeenCalled()
  })
})
