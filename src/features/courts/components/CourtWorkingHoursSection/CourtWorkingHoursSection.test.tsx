import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getCourtWorkingHours,
  saveCourtWorkingHours,
} from '../../courtWorkingHoursApi'
import { getWeekdayLabel, weekdays } from './courtWorkingHours.helpers'
import { CourtWorkingHoursSection } from './CourtWorkingHoursSection'

vi.mock('../../courtWorkingHoursApi', () => ({
  getCourtWorkingHours: vi.fn(),
  saveCourtWorkingHours: vi.fn(),
}))

const mockedGetCourtWorkingHours = vi.mocked(getCourtWorkingHours)
const mockedSaveCourtWorkingHours = vi.mocked(saveCourtWorkingHours)

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
})

describe('CourtWorkingHoursSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedGetCourtWorkingHours.mockResolvedValue({
      court: 7,
      court_name: 'ملعب 1',
      working_hours: [
        {
          id: 1,
          weekday: 'SATURDAY',
          opens_at: '10:00',
          closes_at: '23:00',
          is_closed: false,
        },
      ],
    })
    mockedSaveCourtWorkingHours.mockResolvedValue({
      court: 7,
      court_name: 'ملعب 1',
      working_hours: [],
    })
  })

  it('does not call working-hours endpoint before a new court exists', () => {
    render(<CourtWorkingHoursSection isCreateMode />)

    expect(
      screen.getByText('يمكن ضبط مواعيد العمل بعد إنشاء الملعب'),
    ).toBeInTheDocument()
    expect(mockedGetCourtWorkingHours).not.toHaveBeenCalled()
  })

  it('renders all Arabic weekday labels', async () => {
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
  })

  it('requires opening and closing times for open days', async () => {
    const user = userEvent.setup()

    render(
      <CourtWorkingHoursSection
        clubSlug="nasr-club"
        courtId="7"
        isCreateMode={false}
      />,
    )

    await screen.findByText('السبت')
    await user.clear(screen.getByDisplayValue('10:00'))
    await user.click(screen.getByRole('button', { name: 'حفظ مواعيد الأسبوع' }))

    expect(await screen.findByText('وقت الفتح مطلوب')).toBeInTheDocument()
    expect(mockedSaveCourtWorkingHours).not.toHaveBeenCalled()
  })

  it('sends closed days with null opening and closing times', async () => {
    const user = userEvent.setup()

    render(
      <CourtWorkingHoursSection
        clubSlug="nasr-club"
        courtId="7"
        isCreateMode={false}
      />,
    )

    await screen.findByText('السبت')
    await user.click(screen.getAllByRole('checkbox')[0])
    await user.click(screen.getByRole('button', { name: 'حفظ مواعيد الأسبوع' }))

    await waitFor(() => {
      expect(mockedSaveCourtWorkingHours).toHaveBeenCalledWith('nasr-club', 7, {
        working_hours: expect.arrayContaining([
          {
            weekday: 'SATURDAY',
            opens_at: null,
            closes_at: null,
            is_closed: true,
          },
        ]),
      })
    })
  })
})
