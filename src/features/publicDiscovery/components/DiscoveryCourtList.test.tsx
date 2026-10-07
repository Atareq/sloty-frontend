import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation, useNavigate, useParams } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { listPublicCourts, searchPublicCourts } from '../publicDiscoveryApi'
import type { DiscoveryCourt, DiscoveryCourtPage } from '../publicDiscovery.types'
import { DiscoveryCourtList } from './DiscoveryCourtList'

vi.mock('../publicDiscoveryApi', () => ({
  listPublicCourts: vi.fn(),
  searchPublicCourts: vi.fn(),
}))

const mockedListPublicCourts = vi.mocked(listPublicCourts)
const mockedSearchPublicCourts = vi.mocked(searchPublicCourts)

function makeCourt(overrides: Partial<DiscoveryCourt> = {}): DiscoveryCourt {
  const courtId = overrides.courtId ?? 1
  const clubSlug = overrides.clubSlug ?? 'testing'

  return {
    key: `${clubSlug}:${courtId}`,
    courtId,
    courtName: 'Testing Main Court',
    clubSlug,
    clubName: 'Testing Club',
    addressLabel: 'شارع عباس العقاد، القاهرة',
    imageUrl: 'https://images.example/courts/1.jpg',
    matchingTimes: [],
    ...overrides,
  }
}

function makePage(
  courts: DiscoveryCourt[],
  hasNextPage = false,
): DiscoveryCourtPage {
  return { courts, totalCount: courts.length, hasNextPage }
}

function PublicScheduleProbe() {
  const { clubSlug, courtId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <div>
      <p>
        جدول {clubSlug} {courtId}
      </p>
      <span data-testid="schedule-probe-search">{location.search}</span>
      <button onClick={() => navigate(-1)} type="button">
        رجوع للاكتشاف
      </button>
    </div>
  )
}

function renderList() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route
          element={
            <section>
              <h2 id="courts-heading">ملاعب كرة القدم</h2>
              <DiscoveryCourtList labelledBy="courts-heading" />
            </section>
          }
          path="/"
        />
        <Route
          element={<PublicScheduleProbe />}
          path="/public/:clubSlug/courts/:courtId/schedule"
        />
      </Routes>
    </MemoryRouter>,
  )
}

async function selectFirstAvailableDay(user: ReturnType<typeof userEvent.setup>): Promise<string> {
  const dayOptions = await screen.findAllByTestId(/^discovery-day-option-/)
  const firstDayButton = dayOptions[0]
  const dateValue = firstDayButton?.getAttribute('data-date') ?? ''
  await user.click(firstDayButton!)
  return dateValue
}

describe('DiscoveryCourtList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Every filter change searches immediately, so tests may queue several
    // responses; reset them so nothing leaks into the next test.
    mockedListPublicCourts.mockReset()
    mockedSearchPublicCourts.mockReset()
  })

  it('shows a loading state, then real Courts with image, name, and address', async () => {
    mockedListPublicCourts.mockResolvedValueOnce(makePage([makeCourt()]))
    renderList()

    expect(screen.getByRole('status')).toHaveTextContent('جاري تحميل الملاعب...')
    expect(screen.queryByText('مفيش ملاعب متاحة حاليًا.')).not.toBeInTheDocument()

    const list = await screen.findByRole('list', { name: 'ملاعب كرة القدم' })
    const card = within(list).getByTestId('discovery-court-card')
    expect(within(card).getByRole('heading', { level: 3, name: 'Testing Main Court' }))
      .toBeInTheDocument()
    expect(within(card).getByText('شارع عباس العقاد، القاهرة')).toBeInTheDocument()
    expect(within(card).getByRole('img', { name: 'صورة Testing Main Court' }))
      .toHaveAttribute('src', 'https://images.example/courts/1.jpg')
    expect(within(card).queryByText('المواعيد المتاحة')).not.toBeInTheDocument()
    expect(mockedListPublicCourts).toHaveBeenCalledWith(
      { page: 1 },
      { signal: expect.any(AbortSignal) },
    )
  })

  it('renders only Backend fields on default browse: no price, rating, review, or availability text', async () => {
    mockedListPublicCourts.mockResolvedValueOnce(makePage([makeCourt()]))
    renderList()

    const card = await screen.findByTestId('discovery-court-card')
    for (const forbidden of ['جنيه', 'تقييم', 'مراجعة', 'متاح', 'غير متاح', 'نجوم']) {
      expect(card.textContent).not.toContain(forbidden)
    }
  })

  it('shows a neutral placeholder when the Court has no image', async () => {
    mockedListPublicCourts.mockResolvedValueOnce(
      makePage([makeCourt({ imageUrl: null })]),
    )
    renderList()

    const card = await screen.findByTestId('discovery-court-card')
    expect(within(card).queryByRole('img')).not.toBeInTheDocument()
    expect(within(card).getByTestId('discovery-court-image-placeholder'))
      .toHaveAttribute('aria-hidden', 'true')
  })

  it('falls back to the placeholder when the Backend image fails to load', async () => {
    mockedListPublicCourts.mockResolvedValueOnce(makePage([makeCourt()]))
    renderList()

    fireEvent.error(await screen.findByRole('img', { name: 'صورة Testing Main Court' }))

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByTestId('discovery-court-image-placeholder')).toBeInTheDocument()
  })

  it('omits the address line when Backend has no location for the Court', async () => {
    mockedListPublicCourts.mockResolvedValueOnce(
      makePage([makeCourt({ addressLabel: null })]),
    )
    renderList()

    const card = await screen.findByTestId('discovery-court-card')
    expect(card.querySelector('p')).toBeNull()
  })

  it('links each Court to its existing public schedule and navigates there', async () => {
    const user = userEvent.setup()
    mockedListPublicCourts.mockResolvedValueOnce(
      makePage([makeCourt({ clubSlug: 'nasr-club', courtId: 7, courtName: 'ملعب النصر' })]),
    )
    renderList()

    const link = await screen.findByRole('link', { name: 'ملعب النصر' })
    expect(link).toHaveAttribute('href', '/public/nasr-club/courts/7/schedule')

    await user.click(link)
    expect(screen.getByText('جدول nasr-club 7')).toBeInTheDocument()
  })

  it('shows the empty state when Backend returns no Courts', async () => {
    mockedListPublicCourts.mockResolvedValueOnce(makePage([]))
    renderList()

    expect(await screen.findByText('مفيش ملاعب متاحة حاليًا.')).toBeInTheDocument()
    expect(screen.queryByTestId('discovery-court-card')).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'إعادة المحاولة' })).not.toBeInTheDocument()
  })

  it('shows the error state without any Courts and retries on request', async () => {
    const user = userEvent.setup()
    mockedListPublicCourts
      .mockRejectedValueOnce(new Error('Not found'))
      .mockResolvedValueOnce(makePage([makeCourt()]))
    renderList()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('تعذر تحميل الملاعب الآن. حاول مرة أخرى.')
    expect(screen.queryByTestId('discovery-court-card')).not.toBeInTheDocument()
    expect(screen.queryByText('مفيش ملاعب متاحة حاليًا.')).not.toBeInTheDocument()

    await user.click(within(alert).getByRole('button', { name: 'إعادة المحاولة' }))

    expect(await screen.findByRole('link', { name: 'Testing Main Court' })).toBeInTheDocument()
    expect(mockedListPublicCourts).toHaveBeenCalledTimes(2)
  })

  it('loads the next page on request and hides the action on the last page', async () => {
    const user = userEvent.setup()
    mockedListPublicCourts
      .mockResolvedValueOnce(makePage([makeCourt()], true))
      .mockResolvedValueOnce(
        makePage(
          [
            makeCourt(),
            makeCourt({ courtId: 2, courtName: 'Second Court' }),
          ],
          false,
        ),
      )
    renderList()

    await user.click(await screen.findByRole('button', { name: 'عرض ملاعب أكثر' }))

    expect(await screen.findByRole('link', { name: 'Second Court' })).toBeInTheDocument()
    expect(screen.getAllByTestId('discovery-court-card')).toHaveLength(2)
    expect(mockedListPublicCourts).toHaveBeenLastCalledWith(
      { page: 2 },
      { signal: expect.any(AbortSignal) },
    )
    expect(screen.queryByRole('button', { name: 'عرض ملاعب أكثر' })).not.toBeInTheDocument()
  })

  it('keeps loaded Courts and offers the action again when the next page fails', async () => {
    const user = userEvent.setup()
    mockedListPublicCourts
      .mockResolvedValueOnce(makePage([makeCourt()], true))
      .mockRejectedValueOnce(new Error('Network'))
    renderList()

    await user.click(await screen.findByRole('button', { name: 'عرض ملاعب أكثر' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'تعذر تحميل المزيد من الملاعب. حاول مرة أخرى.',
    )
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'عرض ملاعب أكثر' })).toBeEnabled()
    })
    expect(screen.getAllByTestId('discovery-court-card')).toHaveLength(1)
  })

  describe('Phase 2 — Day + Up to 5 Times Filter', () => {
    it('renders the compact filter bar with اختار اليوم and اختار المواعيد and no Search button', async () => {
      mockedListPublicCourts.mockResolvedValueOnce(makePage([makeCourt()]))
      renderList()

      await screen.findByRole('link', { name: 'Testing Main Court' })

      const filterBar = screen.getByTestId('discovery-filter-bar')
      expect(within(filterBar).getByRole('button', { name: 'اختار اليوم' })).toBeInTheDocument()
      expect(within(filterBar).getByRole('button', { name: 'اختار المواعيد' })).toBeInTheDocument()
      expect(within(filterBar).queryByRole('button', { name: 'بحث' })).not.toBeInTheDocument()
      expect(within(filterBar).queryByRole('button', { name: 'مسح الاختيارات' })).not.toBeInTheDocument()
    })

    it('prompts the visitor to choose the day first when tapping اختار المواعيد before a day is selected, then opens times', async () => {
      const user = userEvent.setup()
      mockedListPublicCourts.mockResolvedValueOnce(makePage([makeCourt()]))
      renderList()

      await screen.findByRole('link', { name: 'Testing Main Court' })

      await user.click(screen.getByTestId('discovery-times-trigger'))

      expect(screen.getByTestId('discovery-choose-day-first-hint')).toHaveTextContent(
        'اختار اليوم الأول عشان نعرض مواعيده',
      )

      const selectedDate = await selectFirstAvailableDay(user)
      expect(selectedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)

      // Automatically transitions to the time selection step for that day
      expect(await screen.findByTestId('discovery-time-period-am')).toBeInTheDocument()
      expect(screen.getByTestId('discovery-time-period-pm')).toBeInTheDocument()
    })

    it('allows selecting up to 5 times, disables remaining unselected times at 5, and allows deselecting to pick another time', async () => {
      const user = userEvent.setup()
      mockedListPublicCourts.mockResolvedValueOnce(makePage([makeCourt()]))
      renderList()

      await screen.findByRole('link', { name: 'Testing Main Court' })

      await user.click(screen.getByTestId('discovery-day-trigger'))
      await selectFirstAvailableDay(user)

      await user.click(screen.getByTestId('discovery-times-trigger'))

      const fiveTimes = ['09:00', '10:00', '11:00', '18:00', '19:00']
      for (const time of fiveTimes) {
        await user.click(screen.getByTestId(`discovery-time-slot-${time}`))
      }

      expect(screen.getByText('تم اختيار 5 مواعيد')).toBeInTheDocument()

      const sixthSlot = screen.getByTestId('discovery-time-slot-20:00')
      expect(sixthSlot).toBeDisabled()

      // Deselect 10:00 and verify 20:00 becomes selectable again
      const secondSlot = screen.getByTestId('discovery-time-slot-10:00')
      expect(secondSlot).not.toBeDisabled()
      await user.click(secondSlot)

      expect(sixthSlot).not.toBeDisabled()
      await user.click(sixthSlot)
      expect(sixthSlot).toHaveAttribute('aria-pressed', 'true')
    })

    it('clears selected times when the visitor changes the selected day', async () => {
      const user = userEvent.setup()
      mockedListPublicCourts.mockResolvedValueOnce(makePage([makeCourt()]))
      renderList()

      await screen.findByRole('link', { name: 'Testing Main Court' })

      // Select day 1
      await user.click(screen.getByTestId('discovery-day-trigger'))
      const dayOptionsFirstOpen = await screen.findAllByTestId(/^discovery-day-option-/)
      await user.click(dayOptionsFirstOpen[0]!)

      // Select two times
      await user.click(screen.getByTestId('discovery-times-trigger'))
      await user.click(screen.getByTestId('discovery-time-slot-10:00'))
      await user.click(screen.getByTestId('discovery-time-slot-18:00'))
      await user.click(screen.getByTestId('discovery-time-sheet-done'))

      expect(screen.getByTestId('discovery-times-trigger')).not.toHaveTextContent('اختار المواعيد')

      // Change to day 2
      await user.click(screen.getByTestId('discovery-day-trigger'))
      const dayOptionsSecondOpen = await screen.findAllByTestId(/^discovery-day-option-/)
      await user.click(dayOptionsSecondOpen[1]!)

      // Selected times must be cleared
      expect(screen.getByTestId('discovery-times-trigger')).toHaveTextContent('اختار المواعيد')
    })

    it('searches immediately by day only when a day is selected, showing الملاعب المتاحة في اليوم المختار without matching-time chips', async () => {
      const user = userEvent.setup()
      mockedListPublicCourts.mockResolvedValueOnce(makePage([makeCourt()]))
      mockedSearchPublicCourts.mockResolvedValueOnce(
        makePage([
          makeCourt({
            courtId: 4,
            courtName: 'ملعب اليوم المتاح',
            matchingTimes: ['10:00', '18:00'],
          }),
        ]),
      )
      renderList()

      await screen.findByRole('link', { name: 'Testing Main Court' })

      await user.click(screen.getByTestId('discovery-day-trigger'))
      const selectedDate = await selectFirstAvailableDay(user)

      expect(mockedSearchPublicCourts).toHaveBeenCalledWith(
        {
          date: selectedDate,
          times: [],
          page: 1,
        },
        { signal: expect.any(AbortSignal) },
      )
      expect(
        await screen.findByRole('heading', {
          level: 3,
          name: 'الملاعب المتاحة في اليوم المختار',
        }),
      ).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'ملعب اليوم المتاح' })).toBeInTheDocument()
      expect(screen.queryByText('المواعيد المتاحة')).not.toBeInTheDocument()
      expect(screen.queryByTestId(/^discovery-matching-time-/)).not.toBeInTheDocument()
    })

    it('shows the specific empty state for day + times and for day-only searches', async () => {
      const user = userEvent.setup()
      mockedListPublicCourts.mockResolvedValueOnce(makePage([makeCourt()]))
      mockedSearchPublicCourts
        .mockResolvedValueOnce(makePage([]))
        .mockResolvedValueOnce(makePage([]))
      renderList()

      await screen.findByRole('link', { name: 'Testing Main Court' })

      // 1. Day-only empty state
      await user.click(screen.getByTestId('discovery-day-trigger'))
      await selectFirstAvailableDay(user)

      expect(
        await screen.findByText('مفيش ملاعب متاحة في اليوم ده حاليًا.'),
      ).toBeInTheDocument()

      // 2. Day + times empty state
      await user.click(screen.getByTestId('discovery-times-trigger'))
      await user.click(screen.getByTestId('discovery-time-slot-21:00'))
      await user.click(screen.getByTestId('discovery-time-sheet-done'))

      expect(
        await screen.findByText('مفيش ملاعب متاحة في المواعيد دي حاليًا.'),
      ).toBeInTheDocument()
    })

    it('restores the default unfiltered Court list when the day is cleared from its sheet', async () => {
      const user = userEvent.setup()
      mockedListPublicCourts
        .mockResolvedValueOnce(makePage([makeCourt({ courtName: 'ملعب افتراضي' })]))
        .mockResolvedValueOnce(makePage([makeCourt({ courtName: 'ملعب افتراضي' })]))
      mockedSearchPublicCourts.mockResolvedValue(
        makePage([
          makeCourt({
            courtId: 9,
            courtName: 'ملعب مفلتر',
            matchingTimes: ['18:00'],
          }),
        ]),
      )
      renderList()

      expect(await screen.findByRole('link', { name: 'ملعب افتراضي' })).toBeInTheDocument()

      await user.click(screen.getByTestId('discovery-day-trigger'))
      await selectFirstAvailableDay(user)
      await user.click(screen.getByTestId('discovery-times-trigger'))
      await user.click(screen.getByTestId('discovery-time-slot-18:00'))
      await user.click(screen.getByTestId('discovery-time-sheet-done'))

      expect(await screen.findByRole('link', { name: 'ملعب مفلتر' })).toBeInTheDocument()
      expect(screen.getByText('المواعيد المتاحة')).toBeInTheDocument()

      await user.click(screen.getByTestId('discovery-day-trigger'))
      await user.click(
        within(screen.getByRole('dialog')).getByRole('button', { name: 'مسح الاختيار' }),
      )
      await user.click(screen.getByRole('button', { name: 'إغلاق' }))

      expect(await screen.findByRole('link', { name: 'ملعب افتراضي' })).toBeInTheDocument()
      expect(screen.queryByText('المواعيد المتاحة')).not.toBeInTheDocument()
      expect(screen.getByTestId('discovery-day-trigger')).toHaveTextContent('اختار اليوم')
      expect(screen.getByTestId('discovery-times-trigger')).toHaveTextContent('اختار المواعيد')
      expect(screen.queryByTestId('discovery-search-button')).not.toBeInTheDocument()
      expect(mockedListPublicCourts).toHaveBeenCalledTimes(2)
    })
  })

  describe('Phase 3 — Matching Courts + Matching Requested Times', () => {
    it('renders a single requested matching time (18:00) on the Court result card', async () => {
      const user = userEvent.setup()
      mockedListPublicCourts.mockResolvedValueOnce(makePage([makeCourt()]))
      mockedSearchPublicCourts.mockResolvedValue(
        makePage([
          makeCourt({
            courtId: 12,
            courtName: 'ملعب الأبطال',
            addressLabel: 'شارع الجمهورية، القاهرة',
            matchingTimes: ['18:00'],
          }),
        ]),
      )
      renderList()

      await screen.findByRole('link', { name: 'Testing Main Court' })

      await user.click(screen.getByTestId('discovery-day-trigger'))
      await selectFirstAvailableDay(user)
      await user.click(screen.getByTestId('discovery-times-trigger'))
      await user.click(screen.getByTestId('discovery-time-slot-18:00'))
      await user.click(screen.getByTestId('discovery-time-sheet-done'))

      const card = await screen.findByTestId('discovery-court-card')
      expect(within(card).getByRole('heading', { level: 3, name: 'ملعب الأبطال' })).toBeInTheDocument()
      expect(within(card).getByText('شارع الجمهورية، القاهرة')).toBeInTheDocument()
      expect(within(card).getByText('المواعيد المتاحة')).toBeInTheDocument()

      const matchedTimeLinks = within(card).getAllByTestId(/^discovery-matching-time-/)
      expect(matchedTimeLinks).toHaveLength(1)
      expect(matchedTimeLinks[0]).toHaveTextContent('18:00')
    })

    it('renders multiple Courts with their exact subset of matching requested times (OR matching from Backend)', async () => {
      const user = userEvent.setup()
      mockedListPublicCourts.mockResolvedValueOnce(makePage([makeCourt()]))
      mockedSearchPublicCourts.mockResolvedValue(
        makePage([
          makeCourt({
            courtId: 1,
            clubSlug: 'champions',
            courtName: 'ملعب الأبطال 1',
            matchingTimes: ['10:00', '18:00'],
          }),
          makeCourt({
            courtId: 2,
            clubSlug: 'stars',
            courtName: 'ملعب النجوم 2',
            matchingTimes: ['11:00'],
          }),
        ]),
      )
      renderList()

      await screen.findByRole('link', { name: 'Testing Main Court' })

      await user.click(screen.getByTestId('discovery-day-trigger'))
      const selectedDate = await selectFirstAvailableDay(user)
      await user.click(screen.getByTestId('discovery-times-trigger'))
      await user.click(screen.getByTestId('discovery-time-slot-10:00'))
      await user.click(screen.getByTestId('discovery-time-slot-11:00'))
      await user.click(screen.getByTestId('discovery-time-slot-18:00'))
      await user.click(screen.getByTestId('discovery-time-sheet-done'))

      expect(mockedSearchPublicCourts).toHaveBeenCalledWith(
        {
          date: selectedDate,
          times: ['10:00', '11:00', '18:00'],
          page: 1,
        },
        { signal: expect.any(AbortSignal) },
      )

      const cards = await screen.findAllByTestId('discovery-court-card')
      expect(cards).toHaveLength(2)

      // Court A shows 10:00 and 18:00 only
      expect(within(cards[0]!).getByRole('link', { name: 'ملعب الأبطال 1' })).toBeInTheDocument()
      expect(within(cards[0]!).getByTestId('discovery-matching-time-10:00')).toBeInTheDocument()
      expect(within(cards[0]!).getByTestId('discovery-matching-time-18:00')).toBeInTheDocument()
      expect(within(cards[0]!).queryByTestId('discovery-matching-time-11:00')).not.toBeInTheDocument()

      // Court B shows 11:00 only
      expect(within(cards[1]!).getByRole('link', { name: 'ملعب النجوم 2' })).toBeInTheDocument()
      expect(within(cards[1]!).getByTestId('discovery-matching-time-11:00')).toBeInTheDocument()
      expect(within(cards[1]!).queryByTestId('discovery-matching-time-10:00')).not.toBeInTheDocument()
      expect(within(cards[1]!).queryByTestId('discovery-matching-time-18:00')).not.toBeInTheDocument()
    })

    it('sends all 5 selected times and displays Backend matching times across paginated pages', async () => {
      const user = userEvent.setup()
      mockedListPublicCourts.mockResolvedValueOnce(makePage([makeCourt()]))
      const firstResultsPage = makePage(
        [
          makeCourt({
            courtId: 10,
            courtName: 'ملعب الصفحة الأولى',
            matchingTimes: ['09:00', '10:00', '18:00'],
          }),
        ],
        true,
      )
      const secondResultsPage = makePage(
        [
          makeCourt({
            courtId: 11,
            courtName: 'ملعب الصفحة الثانية',
            matchingTimes: ['11:00', '19:00'],
          }),
        ],
        false,
      )
      mockedSearchPublicCourts.mockImplementation(async ({ page }) =>
        page === 1 ? firstResultsPage : secondResultsPage,
      )
      renderList()

      await screen.findByRole('link', { name: 'Testing Main Court' })

      await user.click(screen.getByTestId('discovery-day-trigger'))
      const selectedDate = await selectFirstAvailableDay(user)

      await user.click(screen.getByTestId('discovery-times-trigger'))
      for (const time of ['09:00', '10:00', '11:00', '18:00', '19:00']) {
        await user.click(screen.getByTestId(`discovery-time-slot-${time}`))
      }
      await user.click(screen.getByTestId('discovery-time-sheet-done'))

      expect(mockedSearchPublicCourts).toHaveBeenCalledWith(
        {
          date: selectedDate,
          times: ['09:00', '10:00', '11:00', '18:00', '19:00'],
          page: 1,
        },
        { signal: expect.any(AbortSignal) },
      )

      expect(await screen.findByRole('link', { name: 'ملعب الصفحة الأولى' })).toBeInTheDocument()
      expect(screen.getByTestId('discovery-matching-time-09:00')).toBeInTheDocument()
      expect(screen.getByTestId('discovery-matching-time-10:00')).toBeInTheDocument()
      expect(screen.getByTestId('discovery-matching-time-18:00')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'عرض ملاعب أكثر' }))

      expect(await screen.findByRole('link', { name: 'ملعب الصفحة الثانية' })).toBeInTheDocument()
      expect(screen.getByTestId('discovery-matching-time-11:00')).toBeInTheDocument()
      expect(screen.getByTestId('discovery-matching-time-19:00')).toBeInTheDocument()
      expect(mockedSearchPublicCourts).toHaveBeenLastCalledWith(
        {
          date: selectedDate,
          times: ['09:00', '10:00', '11:00', '18:00', '19:00'],
          page: 2,
        },
        { signal: expect.any(AbortSignal) },
      )
    })

    it('navigates to the existing Public Schedule when a matching time button is clicked', async () => {
      const user = userEvent.setup()
      mockedListPublicCourts.mockResolvedValueOnce(makePage([makeCourt()]))
      mockedSearchPublicCourts.mockResolvedValue(
        makePage([
          makeCourt({
            clubSlug: 'ahly-club',
            courtId: 5,
            courtName: 'ملعب الأهلي',
            matchingTimes: ['18:00'],
          }),
        ]),
      )
      renderList()

      await screen.findByRole('link', { name: 'Testing Main Court' })

      await user.click(screen.getByTestId('discovery-day-trigger'))
      const selectedDate = await selectFirstAvailableDay(user)
      await user.click(screen.getByTestId('discovery-times-trigger'))
      await user.click(screen.getByTestId('discovery-time-slot-18:00'))
      await user.click(screen.getByTestId('discovery-time-sheet-done'))

      const timeLink = await screen.findByTestId('discovery-matching-time-18:00')
      expect(timeLink).toHaveAttribute(
        'href',
        `/public/ahly-club/courts/5/schedule?date=${selectedDate}&time=18%3A00`,
      )

      await user.click(timeLink)
      expect(screen.getByText('جدول ahly-club 5')).toBeInTheDocument()
    })

    it('navigates to the existing Public Schedule when the Court name link on a Phase 3 card is clicked', async () => {
      const user = userEvent.setup()
      mockedListPublicCourts.mockResolvedValueOnce(makePage([makeCourt()]))
      mockedSearchPublicCourts.mockResolvedValue(
        makePage([
          makeCourt({
            clubSlug: 'zamalek-club',
            courtId: 8,
            courtName: 'ملعب الزمالك',
            matchingTimes: ['10:00', '18:00'],
          }),
        ]),
      )
      renderList()

      await screen.findByRole('link', { name: 'Testing Main Court' })

      await user.click(screen.getByTestId('discovery-day-trigger'))
      const selectedDate = await selectFirstAvailableDay(user)
      await user.click(screen.getByTestId('discovery-times-trigger'))
      await user.click(screen.getByTestId('discovery-time-slot-10:00'))
      await user.click(screen.getByTestId('discovery-time-sheet-done'))

      const courtLink = await screen.findByRole('link', { name: 'ملعب الزمالك' })
      expect(courtLink).toHaveAttribute(
        'href',
        `/public/zamalek-club/courts/8/schedule?date=${selectedDate}`,
      )

      await user.click(courtLink)
      expect(screen.getByText('جدول zamalek-club 8')).toBeInTheDocument()
    })

    it('keeps selected day and times on search API failure and repeats the exact search on Retry', async () => {
      const user = userEvent.setup()
      mockedListPublicCourts.mockResolvedValueOnce(makePage([makeCourt()]))
      mockedSearchPublicCourts
        .mockResolvedValueOnce(makePage([]))
        .mockRejectedValueOnce(new Error('Search failed'))
        .mockResolvedValueOnce(
          makePage([
            makeCourt({
              courtId: 3,
              courtName: 'ملعب بعد المحاولة',
              matchingTimes: ['18:00'],
            }),
          ]),
        )
      renderList()

      await screen.findByRole('link', { name: 'Testing Main Court' })

      await user.click(screen.getByTestId('discovery-day-trigger'))
      const selectedDate = await selectFirstAvailableDay(user)
      await user.click(screen.getByTestId('discovery-times-trigger'))
      await user.click(screen.getByTestId('discovery-time-slot-18:00'))
      await user.click(screen.getByTestId('discovery-time-sheet-done'))

      const alert = await screen.findByRole('alert')
      expect(alert).toHaveTextContent('تعذر تحميل الملاعب الآن. حاول مرة أخرى.')
      expect(screen.queryByText('مفيش ملاعب متاحة في المواعيد دي حاليًا.')).not.toBeInTheDocument()

      await user.click(within(alert).getByRole('button', { name: 'إعادة المحاولة' }))

      expect(await screen.findByRole('link', { name: 'ملعب بعد المحاولة' })).toBeInTheDocument()
      expect(screen.getByTestId('discovery-matching-time-18:00')).toBeInTheDocument()
      expect(mockedSearchPublicCourts).toHaveBeenLastCalledWith(
        {
          date: selectedDate,
          times: ['18:00'],
          page: 1,
        },
        { signal: expect.any(AbortSignal) },
      )
    })

    it('contains zero nested interactive elements and exposes accessible names on matching-time links', async () => {
      const user = userEvent.setup()
      mockedListPublicCourts.mockResolvedValueOnce(makePage([makeCourt()]))
      mockedSearchPublicCourts.mockResolvedValue(
        makePage([
          makeCourt({
            courtId: 1,
            courtName: 'ملعب الأبطال',
            matchingTimes: ['10:00', '18:00'],
          }),
        ]),
      )
      renderList()

      await screen.findByRole('link', { name: 'Testing Main Court' })

      await user.click(screen.getByTestId('discovery-day-trigger'))
      await selectFirstAvailableDay(user)
      await user.click(screen.getByTestId('discovery-times-trigger'))
      await user.click(screen.getByTestId('discovery-time-slot-10:00'))
      await user.click(screen.getByTestId('discovery-time-slot-18:00'))
      await user.click(screen.getByTestId('discovery-time-sheet-done'))

      const card = await screen.findByTestId('discovery-court-card')
      expect(card.querySelectorAll('a a, a button, button a, button button')).toHaveLength(0)

      expect(
        within(card).getByRole('link', {
          name: /موعد متاح 10:00 .* في ملعب الأبطال/,
        }),
      ).toBeInTheDocument()
      expect(
        within(card).getByRole('link', {
          name: /موعد متاح 18:00 .* في ملعب الأبطال/,
        }),
      ).toBeInTheDocument()
    })
  })

  describe('Phase 4 — Choose a Specific Court', () => {
    it('renders the اختار ملعب معين trigger with Search hidden when no filters are selected', async () => {
      mockedListPublicCourts.mockResolvedValueOnce(makePage([makeCourt()]))
      renderList()

      await screen.findByRole('link', { name: 'Testing Main Court' })

      const filterBar = screen.getByTestId('discovery-filter-bar')
      expect(
        within(filterBar).getByRole('button', { name: 'اختار ملعب معين' }),
      ).toBeInTheDocument()
      expect(within(filterBar).queryByRole('button', { name: 'بحث' })).not.toBeInTheDocument()
    })

    it('opens the Court selector sheet, loads Backend Court options, shows the selected Court name on the trigger, and searches immediately', async () => {
      const user = userEvent.setup()
      mockedListPublicCourts
        .mockResolvedValueOnce(makePage([makeCourt()]))
        .mockResolvedValueOnce(
          makePage([
            makeCourt({
              courtId: 12,
              clubSlug: 'champions',
              courtName: 'ملعب الأبطال',
              clubName: 'نادي الأبطال',
            }),
            makeCourt({
              courtId: 15,
              clubSlug: 'stars',
              courtName: 'ملعب النجوم',
              clubName: 'نادي النجوم',
            }),
          ]),
        )
      renderList()

      await screen.findByRole('link', { name: 'Testing Main Court' })

      await user.click(screen.getByTestId('discovery-court-trigger'))

      const sheet = await screen.findByTestId('discovery-court-filter-sheet')
      const optionButton = await within(sheet).findByTestId('discovery-court-option-champions:12')
      expect(optionButton).toHaveTextContent('ملعب الأبطال')

      await user.click(optionButton)

      const trigger = screen.getByTestId('discovery-court-trigger')
      expect(trigger).toHaveTextContent('ملعب الأبطال')
      expect(trigger).toHaveAttribute('aria-label', 'اختار ملعب معين: ملعب الأبطال')
      expect(mockedSearchPublicCourts).toHaveBeenCalledTimes(1)
      expect(mockedSearchPublicCourts).toHaveBeenCalledWith(
        { date: null, times: [], courtId: 12, page: 1 },
        { signal: expect.any(AbortSignal) },
      )
      expect(
        await screen.findByRole('heading', { level: 3, name: 'الملعب المختار' }),
      ).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'بحث' })).not.toBeInTheDocument()
    })

    it('distinguishes duplicate Court names across Clubs using clubName inside the selector and selects by stable identity rather than display name', async () => {
      const user = userEvent.setup()
      const duplicateClubsPage = makePage([
        makeCourt({
          courtId: 101,
          clubSlug: 'champions',
          courtName: 'ملعب 1',
          clubName: 'نادي الأبطال',
        }),
        makeCourt({
          courtId: 202,
          clubSlug: 'stars',
          courtName: 'ملعب 1',
          clubName: 'نادي النجوم',
        }),
        makeCourt({
          courtId: 303,
          clubSlug: 'olympic',
          courtName: 'ملعب الأوليمبي',
          clubName: 'النادي الأوليمبي',
        }),
      ])
      mockedListPublicCourts
        .mockResolvedValueOnce(makePage([makeCourt()]))
        .mockResolvedValueOnce(duplicateClubsPage)
        .mockResolvedValueOnce(duplicateClubsPage)
      mockedSearchPublicCourts.mockResolvedValue(makePage([]))
      renderList()

      await screen.findByRole('link', { name: 'Testing Main Court' })

      await user.click(screen.getByTestId('discovery-court-trigger'))

      const optionChampions = await screen.findByTestId('discovery-court-option-champions:101')
      const optionStars = screen.getByTestId('discovery-court-option-stars:202')
      const optionUnique = screen.getByTestId('discovery-court-option-olympic:303')

      expect(within(optionChampions).getByText('نادي الأبطال')).toBeInTheDocument()
      expect(within(optionStars).getByText('نادي النجوم')).toBeInTheDocument()
      expect(
        within(optionUnique).queryByTestId('discovery-court-option-club-name'),
      ).not.toBeInTheDocument()

      await user.click(optionStars)

      // Reopen selector and verify only stars:202 is marked selected, not champions:101
      await user.click(screen.getByTestId('discovery-court-trigger'))

      const reopenedChampions = await screen.findByTestId('discovery-court-option-champions:101')
      const reopenedStars = screen.getByTestId('discovery-court-option-stars:202')

      expect(reopenedStars).toHaveAttribute('aria-pressed', 'true')
      expect(reopenedChampions).toHaveAttribute('aria-pressed', 'false')
    })

    it('performs a Court-only search with courtId and renders the simple Phase 1 Court card without المواعيد المتاحة', async () => {
      const user = userEvent.setup()
      mockedListPublicCourts
        .mockResolvedValueOnce(makePage([makeCourt()]))
        .mockResolvedValueOnce(
          makePage([
            makeCourt({
              courtId: 12,
              clubSlug: 'champions',
              courtName: 'ملعب الأبطال',
              clubName: 'نادي الأبطال',
            }),
          ]),
        )
      mockedSearchPublicCourts.mockResolvedValueOnce(
        makePage([
          makeCourt({
            courtId: 12,
            clubSlug: 'champions',
            courtName: 'ملعب الأبطال',
            clubName: 'نادي الأبطال',
            addressLabel: 'شارع الجمهورية، أسيوط',
          }),
        ]),
      )
      renderList()

      await screen.findByRole('link', { name: 'Testing Main Court' })

      await user.click(screen.getByTestId('discovery-court-trigger'))
      await user.click(await screen.findByTestId('discovery-court-option-champions:12'))

      expect(mockedSearchPublicCourts).toHaveBeenCalledWith(
        {
          date: null,
          times: [],
          courtId: 12,
          page: 1,
        },
        { signal: expect.any(AbortSignal) },
      )

      const card = await screen.findByTestId('discovery-court-card')
      expect(within(card).getByRole('link', { name: 'ملعب الأبطال' })).toHaveAttribute(
        'href',
        '/public/champions/courts/12/schedule',
      )
      expect(within(card).queryByText('المواعيد المتاحة')).not.toBeInTheDocument()
      expect(within(card).queryByTestId('discovery-matching-times')).not.toBeInTheDocument()
    })

    it('searches again immediately when the Court changes and replaces the previous Court (single-select)', async () => {
      const user = userEvent.setup()
      const optionsPage = makePage([
        makeCourt({
          courtId: 12,
          clubSlug: 'champions',
          courtName: 'ملعب الأبطال',
        }),
        makeCourt({
          courtId: 19,
          clubSlug: 'stars',
          courtName: 'ملعب النجوم',
        }),
      ])
      mockedListPublicCourts
        .mockResolvedValueOnce(makePage([makeCourt()]))
        .mockResolvedValue(optionsPage)
      mockedSearchPublicCourts.mockImplementation(async ({ courtId }) =>
        makePage([
          courtId === 12
            ? makeCourt({ courtId: 12, clubSlug: 'champions', courtName: 'ملعب الأبطال' })
            : makeCourt({ courtId: 19, clubSlug: 'stars', courtName: 'ملعب النجوم' }),
        ]),
      )
      renderList()

      await screen.findByRole('link', { name: 'Testing Main Court' })

      await user.click(screen.getByTestId('discovery-court-trigger'))
      await user.click(await screen.findByTestId('discovery-court-option-champions:12'))

      expect(await screen.findByRole('link', { name: 'ملعب الأبطال' })).toBeInTheDocument()

      // Changing the Court searches again right away, with no Apply step
      await user.click(screen.getByTestId('discovery-court-trigger'))
      await user.click(await screen.findByTestId('discovery-court-option-stars:19'))

      expect(screen.getByTestId('discovery-court-trigger')).toHaveTextContent('ملعب النجوم')
      expect(mockedSearchPublicCourts).toHaveBeenCalledTimes(2)
      expect(mockedSearchPublicCourts).toHaveBeenLastCalledWith(
        { date: null, times: [], courtId: 19, page: 1 },
        { signal: expect.any(AbortSignal) },
      )
      expect(await screen.findByRole('link', { name: 'ملعب النجوم' })).toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'ملعب الأبطال' })).not.toBeInTheDocument()

      // Single-select: reopening shows only the replacement Court as selected
      await user.click(screen.getByTestId('discovery-court-trigger'))
      expect(
        await screen.findByTestId('discovery-court-option-stars:19'),
      ).toHaveAttribute('aria-pressed', 'true')
      expect(
        screen.getByTestId('discovery-court-option-champions:12'),
      ).toHaveAttribute('aria-pressed', 'false')
    })

    it('shows an error state and retry inside the Court selector when loading Court options fails', async () => {
      const user = userEvent.setup()
      mockedListPublicCourts
        .mockResolvedValueOnce(makePage([makeCourt()]))
        .mockRejectedValueOnce(new Error('Selector API failed'))
        .mockResolvedValueOnce(
          makePage([
            makeCourt({
              courtId: 12,
              clubSlug: 'champions',
              courtName: 'ملعب الأبطال',
            }),
          ]),
        )
      renderList()

      await screen.findByRole('link', { name: 'Testing Main Court' })

      await user.click(screen.getByTestId('discovery-court-trigger'))

      const sheet = await screen.findByTestId('discovery-court-filter-sheet')
      const alert = await within(sheet).findByRole('alert')
      expect(alert).toHaveTextContent('تعذر تحميل الملاعب الآن. حاول مرة أخرى.')
      expect(within(sheet).queryByText('مفيش ملاعب متاحة حاليًا.')).not.toBeInTheDocument()

      await user.click(within(alert).getByRole('button', { name: 'إعادة المحاولة' }))

      expect(
        await within(sheet).findByTestId('discovery-court-option-champions:12'),
      ).toBeInTheDocument()
    })

    it('shows the empty state inside the Court selector when Backend returns zero Courts', async () => {
      const user = userEvent.setup()
      mockedListPublicCourts
        .mockResolvedValueOnce(makePage([makeCourt()]))
        .mockResolvedValueOnce(makePage([]))
      renderList()

      await screen.findByRole('link', { name: 'Testing Main Court' })

      await user.click(screen.getByTestId('discovery-court-trigger'))

      const sheet = await screen.findByTestId('discovery-court-filter-sheet')
      expect(await within(sheet).findByText('مفيش ملاعب متاحة حاليًا.')).toBeInTheDocument()
      expect(within(sheet).queryByRole('alert')).not.toBeInTheDocument()
    })

    it('supports pagination inside the Court selector and preserves courtId when paginating filtered search results', async () => {
      const user = userEvent.setup()
      mockedListPublicCourts
        .mockResolvedValueOnce(makePage([makeCourt()]))
        .mockResolvedValueOnce(
          makePage(
            [
              makeCourt({
                courtId: 12,
                clubSlug: 'champions',
                courtName: 'ملعب الأبطال',
              }),
            ],
            true,
          ),
        )
        .mockResolvedValueOnce(
          makePage(
            [
              makeCourt({
                courtId: 25,
                clubSlug: 'page2-club',
                courtName: 'ملعب الصفحة الثانية في الاختيار',
              }),
            ],
            false,
          ),
        )
      mockedSearchPublicCourts
        .mockResolvedValueOnce(
          makePage(
            [
              makeCourt({
                courtId: 25,
                clubSlug: 'page2-club',
                courtName: 'ملعب الصفحة الثانية في الاختيار',
              }),
            ],
            true,
          ),
        )
        .mockResolvedValueOnce(
          makePage(
            [
              makeCourt({
                courtId: 26,
                clubSlug: 'page2-club',
                courtName: 'ملعب إضافي',
              }),
            ],
            false,
          ),
        )
      renderList()

      await screen.findByRole('link', { name: 'Testing Main Court' })

      // Open selector and load page 2 of Court options
      await user.click(screen.getByTestId('discovery-court-trigger'))
      const sheet = await screen.findByTestId('discovery-court-filter-sheet')
      const loadMoreOptionsBtn = await within(sheet).findByTestId(
        'discovery-court-options-load-more',
      )
      await user.click(loadMoreOptionsBtn)

      const page2Option = await within(sheet).findByTestId(
        'discovery-court-option-page2-club:25',
      )
      await user.click(page2Option)

      // Run search for courtId 25 and paginate results

      expect(mockedSearchPublicCourts).toHaveBeenCalledWith(
        {
          date: null,
          times: [],
          courtId: 25,
          page: 1,
        },
        { signal: expect.any(AbortSignal) },
      )

      await user.click(await screen.findByRole('button', { name: 'عرض ملاعب أكثر' }))

      expect(mockedSearchPublicCourts).toHaveBeenLastCalledWith(
        {
          date: null,
          times: [],
          courtId: 25,
          page: 2,
        },
        { signal: expect.any(AbortSignal) },
      )
    })
  })

  describe('Phase 5 — Combined Court + Day + Time Filtering', () => {
    it('D — searches by selected Court + day and renders the simple Court card without المواعيد المتاحة', async () => {
      const user = userEvent.setup()
      mockedListPublicCourts
        .mockResolvedValueOnce(makePage([makeCourt()]))
        .mockResolvedValueOnce(
          makePage([
            makeCourt({
              courtId: 12,
              clubSlug: 'champions',
              courtName: 'ملعب الأبطال',
            }),
          ]),
        )
      mockedSearchPublicCourts.mockResolvedValue(
        makePage([
          makeCourt({
            courtId: 12,
            clubSlug: 'champions',
            courtName: 'ملعب الأبطال',
            addressLabel: 'شارع التحرير، القاهرة',
          }),
        ]),
      )
      renderList()

      await screen.findByRole('link', { name: 'Testing Main Court' })

      await user.click(screen.getByTestId('discovery-court-trigger'))
      await user.click(await screen.findByTestId('discovery-court-option-champions:12'))

      await user.click(screen.getByTestId('discovery-day-trigger'))
      const selectedDate = await selectFirstAvailableDay(user)

      expect(mockedSearchPublicCourts).toHaveBeenCalledWith(
        {
          date: selectedDate,
          times: [],
          courtId: 12,
          page: 1,
        },
        { signal: expect.any(AbortSignal) },
      )

      const card = await screen.findByTestId('discovery-court-card')
      expect(within(card).getByRole('link', { name: 'ملعب الأبطال' })).toBeInTheDocument()
      expect(within(card).queryByText('المواعيد المتاحة')).not.toBeInTheDocument()
      expect(within(card).queryByTestId('discovery-matching-times')).not.toBeInTheDocument()
    })

    it('E & F — searches by selected Court + day + requested times and renders only Backend matching_times on the Phase 3 card', async () => {
      const user = userEvent.setup()
      mockedListPublicCourts
        .mockResolvedValueOnce(makePage([makeCourt()]))
        .mockResolvedValueOnce(
          makePage([
            makeCourt({
              courtId: 12,
              clubSlug: 'champions',
              courtName: 'ملعب الأبطال',
            }),
          ]),
        )
      mockedSearchPublicCourts.mockResolvedValue(
        makePage([
          makeCourt({
            courtId: 12,
            clubSlug: 'champions',
            courtName: 'ملعب الأبطال',
            matchingTimes: ['11:00', '18:00'],
          }),
        ]),
      )
      renderList()

      await screen.findByRole('link', { name: 'Testing Main Court' })

      await user.click(screen.getByTestId('discovery-court-trigger'))
      await user.click(await screen.findByTestId('discovery-court-option-champions:12'))

      await user.click(screen.getByTestId('discovery-day-trigger'))
      const selectedDate = await selectFirstAvailableDay(user)

      await user.click(screen.getByTestId('discovery-times-trigger'))
      await user.click(screen.getByTestId('discovery-time-slot-10:00'))
      await user.click(screen.getByTestId('discovery-time-slot-11:00'))
      await user.click(screen.getByTestId('discovery-time-slot-18:00'))
      await user.click(screen.getByTestId('discovery-time-sheet-done'))

      expect(mockedSearchPublicCourts).toHaveBeenCalledWith(
        {
          date: selectedDate,
          times: ['10:00', '11:00', '18:00'],
          courtId: 12,
          page: 1,
        },
        { signal: expect.any(AbortSignal) },
      )

      const card = await screen.findByTestId('discovery-court-card')
      expect(within(card).getByText('المواعيد المتاحة')).toBeInTheDocument()
      expect(within(card).getByTestId('discovery-matching-time-11:00')).toBeInTheDocument()
      expect(within(card).getByTestId('discovery-matching-time-18:00')).toBeInTheDocument()
      expect(within(card).queryByTestId('discovery-matching-time-10:00')).not.toBeInTheDocument()
    })

    it('G & L — sends Court + day + all 5 selected times to Backend and preserves all combined criteria on page 2', async () => {
      const user = userEvent.setup()
      mockedListPublicCourts
        .mockResolvedValueOnce(makePage([makeCourt()]))
        .mockResolvedValueOnce(
          makePage([
            makeCourt({
              courtId: 12,
              clubSlug: 'champions',
              courtName: 'ملعب الأبطال',
            }),
          ]),
        )
      const firstResultsPage = makePage(
        [
          makeCourt({
            courtId: 12,
            clubSlug: 'champions',
            courtName: 'ملعب الأبطال',
            matchingTimes: ['09:00', '18:00'],
          }),
        ],
        true,
      )
      const secondResultsPage = makePage(
        [
          makeCourt({
            courtId: 13,
            clubSlug: 'champions',
            courtName: 'ملعب الأبطال 2',
            matchingTimes: ['19:00'],
          }),
        ],
        false,
      )
      mockedSearchPublicCourts.mockImplementation(async ({ page }) =>
        page === 1 ? firstResultsPage : secondResultsPage,
      )
      renderList()

      await screen.findByRole('link', { name: 'Testing Main Court' })

      await user.click(screen.getByTestId('discovery-court-trigger'))
      await user.click(await screen.findByTestId('discovery-court-option-champions:12'))

      await user.click(screen.getByTestId('discovery-day-trigger'))
      const selectedDate = await selectFirstAvailableDay(user)

      await user.click(screen.getByTestId('discovery-times-trigger'))
      for (const time of ['09:00', '10:00', '11:00', '18:00', '19:00']) {
        await user.click(screen.getByTestId(`discovery-time-slot-${time}`))
      }
      await user.click(screen.getByTestId('discovery-time-sheet-done'))

      expect(mockedSearchPublicCourts).toHaveBeenCalledWith(
        {
          date: selectedDate,
          times: ['09:00', '10:00', '11:00', '18:00', '19:00'],
          courtId: 12,
          page: 1,
        },
        { signal: expect.any(AbortSignal) },
      )

      await user.click(await screen.findByRole('button', { name: 'عرض ملاعب أكثر' }))

      expect(mockedSearchPublicCourts).toHaveBeenLastCalledWith(
        {
          date: selectedDate,
          times: ['09:00', '10:00', '11:00', '18:00', '19:00'],
          courtId: 12,
          page: 2,
        },
        { signal: expect.any(AbortSignal) },
      )
    })

    it('H — shows Court-specific empty messages when selected Court has no match for day-only or day + times', async () => {
      const user = userEvent.setup()
      mockedListPublicCourts
        .mockResolvedValueOnce(makePage([makeCourt()]))
        .mockResolvedValueOnce(
          makePage([
            makeCourt({
              courtId: 12,
              clubSlug: 'champions',
              courtName: 'ملعب الأبطال',
            }),
          ]),
        )
      mockedSearchPublicCourts.mockResolvedValue(makePage([]))
      renderList()

      await screen.findByRole('link', { name: 'Testing Main Court' })

      await user.click(screen.getByTestId('discovery-court-trigger'))
      await user.click(await screen.findByTestId('discovery-court-option-champions:12'))

      await user.click(screen.getByTestId('discovery-day-trigger'))
      await selectFirstAvailableDay(user)

      // 1. Court + day only empty state
      expect(
        await screen.findByText('الملعب ده مش متاح في اليوم ده حاليًا.'),
      ).toBeInTheDocument()
      expect(screen.queryByTestId('discovery-court-card')).not.toBeInTheDocument()

      // 2. Court + day + times empty state
      await user.click(screen.getByTestId('discovery-times-trigger'))
      await user.click(screen.getByTestId('discovery-time-slot-18:00'))
      await user.click(screen.getByTestId('discovery-time-sheet-done'))

      expect(
        await screen.findByText('الملعب ده مش متاح في المواعيد دي حاليًا.'),
      ).toBeInTheDocument()
      expect(screen.queryByTestId('discovery-court-card')).not.toBeInTheDocument()
    })

    it('I, J, K — preserves day and times when changing Court, clears times while keeping Court when changing day, then clears each filter from its own sheet', async () => {
      const user = userEvent.setup()
      const optionsPage = makePage([
        makeCourt({
          courtId: 12,
          clubSlug: 'champions',
          courtName: 'ملعب الأبطال',
        }),
        makeCourt({
          courtId: 19,
          clubSlug: 'stars',
          courtName: 'ملعب النجوم',
        }),
      ])
      mockedListPublicCourts
        .mockResolvedValueOnce(makePage([makeCourt()]))
        .mockResolvedValueOnce(optionsPage)
        .mockResolvedValueOnce(optionsPage)
        .mockResolvedValue(makePage([makeCourt()]))
      mockedSearchPublicCourts.mockImplementation(async ({ courtId }) =>
        makePage([
          courtId === 12
            ? makeCourt({
                courtId: 12,
                clubSlug: 'champions',
                courtName: 'ملعب الأبطال',
                matchingTimes: ['18:00'],
              })
            : makeCourt({
                courtId: 19,
                clubSlug: 'stars',
                courtName: 'ملعب النجوم',
                matchingTimes: ['18:00'],
              }),
        ]),
      )
      renderList()

      await screen.findByRole('link', { name: 'Testing Main Court' })

      // Select Court A + Day 1 + 18:00; each selection searches immediately
      await user.click(screen.getByTestId('discovery-court-trigger'))
      await user.click(await screen.findByTestId('discovery-court-option-champions:12'))
      await user.click(screen.getByTestId('discovery-day-trigger'))
      const dayOptions = await screen.findAllByTestId(/^discovery-day-option-/)
      const day1 = dayOptions[0]?.getAttribute('data-date') ?? ''
      const day2 = dayOptions[1]?.getAttribute('data-date') ?? ''
      await user.click(dayOptions[0]!)
      await user.click(screen.getByTestId('discovery-times-trigger'))
      await user.click(screen.getByTestId('discovery-time-slot-18:00'))
      await user.click(screen.getByTestId('discovery-time-sheet-done'))

      expect(await screen.findByRole('link', { name: 'ملعب الأبطال' })).toBeInTheDocument()

      // I: Change Court to Court B -> day and 18:00 stay, stale Court A result hidden
      await user.click(screen.getByTestId('discovery-court-trigger'))
      await user.click(await screen.findByTestId('discovery-court-option-stars:19'))

      expect(screen.getByTestId('discovery-court-trigger')).toHaveTextContent('ملعب النجوم')
      expect(screen.getByTestId('discovery-times-trigger')).not.toHaveTextContent('اختار المواعيد')
      expect(screen.queryByRole('link', { name: 'ملعب الأبطال' })).not.toBeInTheDocument()

      // Court B was searched immediately with the preserved day1 + 18:00
      expect(mockedSearchPublicCourts).toHaveBeenLastCalledWith(
        {
          date: day1,
          times: ['18:00'],
          courtId: 19,
          page: 1,
        },
        { signal: expect.any(AbortSignal) },
      )
      expect(await screen.findByRole('link', { name: 'ملعب النجوم' })).toBeInTheDocument()

      // J: Change day to day2 -> Court B remains selected, times clear
      await user.click(screen.getByTestId('discovery-day-trigger'))
      const dayOptionsAgain = await screen.findAllByTestId(/^discovery-day-option-/)
      await user.click(dayOptionsAgain[1]!)

      expect(day2).not.toBe(day1)
      expect(screen.getByTestId('discovery-court-trigger')).toHaveTextContent('ملعب النجوم')
      expect(screen.getByTestId('discovery-times-trigger')).toHaveTextContent('اختار المواعيد')
      // The new day is searched immediately, never with the previous day's times
      expect(mockedSearchPublicCourts).toHaveBeenLastCalledWith(
        { date: day2, times: [], courtId: 19, page: 1 },
        { signal: expect.any(AbortSignal) },
      )

      // K: Clear the Court, then the day, each from its own sheet -> default browsing
      await user.click(screen.getByTestId('discovery-court-trigger'))
      await user.click(
        within(screen.getByRole('dialog')).getByRole('button', { name: 'مسح الاختيار' }),
      )
      await user.click(screen.getByRole('button', { name: 'إغلاق' }))
      expect(screen.getByTestId('discovery-court-trigger')).toHaveTextContent('اختار ملعب معين')
      expect(mockedSearchPublicCourts).toHaveBeenLastCalledWith(
        { date: day2, times: [], page: 1 },
        { signal: expect.any(AbortSignal) },
      )

      await user.click(screen.getByTestId('discovery-day-trigger'))
      await user.click(
        within(screen.getByRole('dialog')).getByRole('button', { name: 'مسح الاختيار' }),
      )
      await user.click(screen.getByRole('button', { name: 'إغلاق' }))
      expect(screen.getByTestId('discovery-day-trigger')).toHaveTextContent('اختار اليوم')
      expect(screen.getByTestId('discovery-times-trigger')).toHaveTextContent('اختار المواعيد')
      expect(await screen.findByRole('link', { name: 'Testing Main Court' })).toBeInTheDocument()
    })

    it('M & N — repeats exact combined criteria on Retry and prevents an older Court A response from overwriting a newer Court B search', async () => {
      const user = userEvent.setup()
      const optionsPage = makePage([
        makeCourt({
          courtId: 12,
          clubSlug: 'champions',
          courtName: 'ملعب الأبطال',
        }),
        makeCourt({
          courtId: 19,
          clubSlug: 'stars',
          courtName: 'ملعب النجوم',
        }),
      ])
      mockedListPublicCourts
        .mockResolvedValueOnce(makePage([makeCourt()]))
        .mockResolvedValueOnce(optionsPage)
        .mockResolvedValueOnce(optionsPage)

      let resolveCourtASearch!: (value: DiscoveryCourtPage) => void
      const courtASearchPromise = new Promise<DiscoveryCourtPage>((resolve) => {
        resolveCourtASearch = resolve
      })

      mockedSearchPublicCourts
        // Court A only, then Court A + day: intermediate immediate searches
        .mockResolvedValueOnce(makePage([]))
        .mockResolvedValueOnce(makePage([]))
        // Court A + day + 18:00 stays in flight
        .mockReturnValueOnce(courtASearchPromise)
        .mockRejectedValueOnce(new Error('Network failure'))
        .mockResolvedValueOnce(
          makePage([
            makeCourt({
              courtId: 19,
              clubSlug: 'stars',
              courtName: 'ملعب النجوم',
              matchingTimes: ['18:00'],
            }),
          ]),
        )

      renderList()

      await screen.findByRole('link', { name: 'Testing Main Court' })

      // Start search for Court A (12) + day + 18:00 (stays in-flight)
      await user.click(screen.getByTestId('discovery-court-trigger'))
      await user.click(await screen.findByTestId('discovery-court-option-champions:12'))
      await user.click(screen.getByTestId('discovery-day-trigger'))
      const selectedDate = await selectFirstAvailableDay(user)
      await user.click(screen.getByTestId('discovery-times-trigger'))
      await user.click(screen.getByTestId('discovery-time-slot-18:00'))
      await user.click(screen.getByTestId('discovery-time-sheet-done'))

      // Immediately switch to Court B (19); its search fails first, then succeeds on Retry
      await user.click(screen.getByTestId('discovery-court-trigger'))
      await user.click(await screen.findByTestId('discovery-court-option-stars:19'))

      const alert = await screen.findByRole('alert')
      expect(alert).toHaveTextContent('تعذر تحميل الملاعب الآن. حاول مرة أخرى.')

      await user.click(within(alert).getByRole('button', { name: 'إعادة المحاولة' }))

      expect(await screen.findByRole('link', { name: 'ملعب النجوم' })).toBeInTheDocument()
      expect(mockedSearchPublicCourts).toHaveBeenLastCalledWith(
        {
          date: selectedDate,
          times: ['18:00'],
          courtId: 19,
          page: 1,
        },
        { signal: expect.any(AbortSignal) },
      )

      // Now resolve the stale Court A response and verify it never overwrites Court B
      resolveCourtASearch(
        makePage([
          makeCourt({
            courtId: 12,
            clubSlug: 'champions',
            courtName: 'ملعب الأبطال',
            matchingTimes: ['18:00'],
          }),
        ]),
      )

      await waitFor(() => {
        expect(screen.getByRole('link', { name: 'ملعب النجوم' })).toBeInTheDocument()
      })
      expect(screen.queryByRole('link', { name: 'ملعب الأبطال' })).not.toBeInTheDocument()
    })
  })

  describe('Phase 6 — Enhanced Discovery → Public Schedule Handoff', () => {
    it('A — opens Public Schedule with no handoff query on plain Phase 1 Court click', async () => {
      const user = userEvent.setup()
      mockedListPublicCourts.mockResolvedValueOnce(
        makePage([
          makeCourt({
            clubSlug: 'testing',
            courtId: 1,
            courtName: 'Testing Main Court',
          }),
        ]),
      )
      renderList()

      const courtLink = await screen.findByRole('link', {
        name: 'Testing Main Court',
      })
      expect(courtLink).toHaveAttribute(
        'href',
        '/public/testing/courts/1/schedule',
      )

      await user.click(courtLink)
      expect(screen.getByText('جدول testing 1')).toBeInTheDocument()
      expect(screen.getByTestId('schedule-probe-search')).toHaveTextContent('')
    })

    it('B — opens Public Schedule with ?date=YYYY-MM-DD when clicking a Court card from a day-only search', async () => {
      const user = userEvent.setup()
      mockedListPublicCourts.mockResolvedValueOnce(makePage([makeCourt()]))
      mockedSearchPublicCourts.mockResolvedValueOnce(
        makePage([
          makeCourt({
            clubSlug: 'champions',
            courtId: 12,
            courtName: 'ملعب الأبطال',
          }),
        ]),
      )
      renderList()

      await screen.findByRole('link', { name: 'Testing Main Court' })

      await user.click(screen.getByTestId('discovery-day-trigger'))
      const selectedDate = await selectFirstAvailableDay(user)

      const courtLink = await screen.findByRole('link', {
        name: 'ملعب الأبطال',
      })
      expect(courtLink).toHaveAttribute(
        'href',
        `/public/champions/courts/12/schedule?date=${selectedDate}`,
      )

      await user.click(courtLink)
      expect(screen.getByText('جدول champions 12')).toBeInTheDocument()
      expect(screen.getByTestId('schedule-probe-search')).toHaveTextContent(
        `?date=${selectedDate}`,
      )
    })

    it('C, D, N — passes ?date=YYYY-MM-DD on Court name click, ?date=YYYY-MM-DD&time=18:00 on matching-time click, and returns cleanly on Back navigation', async () => {
      const user = userEvent.setup()
      mockedListPublicCourts
        .mockResolvedValueOnce(makePage([makeCourt()]))
        .mockResolvedValueOnce(makePage([makeCourt()]))
      mockedSearchPublicCourts.mockResolvedValue(
        makePage([
          makeCourt({
            clubSlug: 'champions',
            courtId: 12,
            courtName: 'ملعب الأبطال',
            matchingTimes: ['10:00', '18:00'],
          }),
        ]),
      )
      renderList()

      await screen.findByRole('link', { name: 'Testing Main Court' })

      await user.click(screen.getByTestId('discovery-day-trigger'))
      const selectedDate = await selectFirstAvailableDay(user)
      await user.click(screen.getByTestId('discovery-times-trigger'))
      await user.click(screen.getByTestId('discovery-time-slot-10:00'))
      await user.click(screen.getByTestId('discovery-time-slot-18:00'))
      await user.click(screen.getByTestId('discovery-time-sheet-done'))

      const courtLink = await screen.findByRole('link', {
        name: 'ملعب الأبطال',
      })
      const timeLink18 = screen.getByTestId('discovery-matching-time-18:00')

      // C: Court name link carries date only, never an arbitrary time
      expect(courtLink).toHaveAttribute(
        'href',
        `/public/champions/courts/12/schedule?date=${selectedDate}`,
      )

      // D: Specific matching-time link carries both date and time
      expect(timeLink18).toHaveAttribute(
        'href',
        `/public/champions/courts/12/schedule?date=${selectedDate}&time=18%3A00`,
      )

      await user.click(timeLink18)
      expect(screen.getByText('جدول champions 12')).toBeInTheDocument()
      expect(screen.getByTestId('schedule-probe-search')).toHaveTextContent(
        `?date=${selectedDate}&time=18%3A00`,
      )

      // N: Back navigation returns cleanly to Discovery without crash
      await user.click(screen.getByRole('button', { name: 'رجوع للاكتشاف' }))
      expect(
        await screen.findByRole('heading', { level: 2, name: 'ملاعب كرة القدم' }),
      ).toBeInTheDocument()
    })
  })

  describe('Reactive filters + sticky مسح الاختيار footers', () => {
    const championsCourt = makeCourt({
      courtId: 12,
      clubSlug: 'champions',
      courtName: 'ملعب الأبطال',
    })

    function deferred<T>() {
      let resolve!: (value: T) => void
      const promise = new Promise<T>((resolvePromise) => {
        resolve = resolvePromise
      })

      return { promise, resolve }
    }

    function getOpenSheetParts() {
      const dialog = screen.getByRole('dialog')

      return {
        dialog,
        body: within(dialog).getByTestId('app-sheet-body'),
        footer: within(dialog).getByTestId('app-sheet-footer'),
        clearButton: within(dialog).getByRole('button', { name: 'مسح الاختيار' }),
      }
    }

    function searchedCriteria() {
      return mockedSearchPublicCourts.mock.calls.map(([params]) => params)
    }

    it('never renders a Search button or a "press Search" prompt while filters change', async () => {
      const user = userEvent.setup()
      mockedListPublicCourts.mockResolvedValue(makePage([makeCourt(), championsCourt]))
      mockedSearchPublicCourts.mockResolvedValue(makePage([championsCourt]))
      renderList()

      await screen.findByRole('link', { name: 'Testing Main Court' })

      await user.click(screen.getByTestId('discovery-court-trigger'))
      await user.click(await screen.findByTestId('discovery-court-option-champions:12'))
      await user.click(screen.getByTestId('discovery-day-trigger'))
      await selectFirstAvailableDay(user)
      await user.click(screen.getByTestId('discovery-times-trigger'))
      await user.click(screen.getByTestId('discovery-time-slot-18:00'))
      await user.click(screen.getByTestId('discovery-time-sheet-done'))

      expect(screen.queryByRole('button', { name: 'بحث' })).not.toBeInTheDocument()
      expect(screen.queryByTestId('discovery-search-button')).not.toBeInTheDocument()
      expect(screen.queryByTestId('discovery-awaiting-search')).not.toBeInTheDocument()
      expect(screen.queryByText(/اضغط «بحث»/)).not.toBeInTheDocument()
    })

    it('sends every time toggle to Backend immediately with the selected day', async () => {
      const user = userEvent.setup()
      mockedListPublicCourts.mockResolvedValue(makePage([makeCourt()]))
      mockedSearchPublicCourts.mockResolvedValue(makePage([]))
      renderList()

      await screen.findByRole('link', { name: 'Testing Main Court' })

      await user.click(screen.getByTestId('discovery-day-trigger'))
      const selectedDate = await selectFirstAvailableDay(user)
      await user.click(screen.getByTestId('discovery-times-trigger'))
      await user.click(screen.getByTestId('discovery-time-slot-18:00'))
      await user.click(screen.getByTestId('discovery-time-slot-19:00'))
      await user.click(screen.getByTestId('discovery-time-slot-18:00'))

      expect(searchedCriteria()).toEqual([
        { date: selectedDate, times: [], page: 1 },
        { date: selectedDate, times: ['18:00'], page: 1 },
        { date: selectedDate, times: ['18:00', '19:00'], page: 1 },
        { date: selectedDate, times: ['19:00'], page: 1 },
      ])
    })

    it('keeps the filter bar and selected values while a new search loads, and never shows the previous results under the new criteria', async () => {
      const user = userEvent.setup()
      const daySearch = deferred<DiscoveryCourtPage>()
      mockedListPublicCourts.mockResolvedValue(makePage([makeCourt()]))
      mockedSearchPublicCourts.mockReturnValueOnce(daySearch.promise)
      renderList()

      await screen.findByRole('link', { name: 'Testing Main Court' })

      await user.click(screen.getByTestId('discovery-day-trigger'))
      await selectFirstAvailableDay(user)

      expect(screen.getByTestId('discovery-filter-bar')).toBeInTheDocument()
      expect(screen.getByTestId('discovery-day-trigger')).not.toHaveTextContent('اختار اليوم')
      expect(screen.getByRole('status')).toHaveTextContent('جاري تحميل الملاعب...')
      expect(screen.queryByRole('link', { name: 'Testing Main Court' })).not.toBeInTheDocument()

      daySearch.resolve(makePage([championsCourt]))

      expect(await screen.findByRole('link', { name: 'ملعب الأبطال' })).toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'Testing Main Court' })).not.toBeInTheDocument()
    })

    it('never lets an older request overwrite newer results: A starts, selection changes, B starts, B resolves, then A resolves', async () => {
      const user = userEvent.setup()
      const requestA = deferred<DiscoveryCourtPage>()
      const requestB = deferred<DiscoveryCourtPage>()
      mockedListPublicCourts.mockResolvedValue(makePage([makeCourt()]))
      mockedSearchPublicCourts.mockImplementation(async ({ times }) => {
        if (times.join(',') === '18:00') {
          return requestA.promise
        }

        if (times.join(',') === '18:00,19:00') {
          return requestB.promise
        }

        return makePage([])
      })
      renderList()

      await screen.findByRole('link', { name: 'Testing Main Court' })

      await user.click(screen.getByTestId('discovery-day-trigger'))
      await selectFirstAvailableDay(user)
      await user.click(screen.getByTestId('discovery-times-trigger'))
      await user.click(screen.getByTestId('discovery-time-slot-18:00'))
      await user.click(screen.getByTestId('discovery-time-slot-19:00'))
      await user.click(screen.getByTestId('discovery-time-sheet-done'))

      requestB.resolve(
        makePage([makeCourt({ courtId: 2, courtName: 'نتيجة الطلب الأحدث', matchingTimes: ['19:00'] })]),
      )
      expect(await screen.findByRole('link', { name: 'نتيجة الطلب الأحدث' })).toBeInTheDocument()

      requestA.resolve(
        makePage([makeCourt({ courtId: 1, courtName: 'نتيجة الطلب الأقدم', matchingTimes: ['18:00'] })]),
      )

      await waitFor(() => {
        expect(screen.getByRole('link', { name: 'نتيجة الطلب الأحدث' })).toBeInTheDocument()
      })
      expect(screen.queryByRole('link', { name: 'نتيجة الطلب الأقدم' })).not.toBeInTheDocument()
    })

    it('Court selector: مسح الاختيار is always shown, disabled without a Court, and clearing keeps the day and searches immediately', async () => {
      const user = userEvent.setup()
      mockedListPublicCourts.mockResolvedValue(makePage([makeCourt(), championsCourt]))
      mockedSearchPublicCourts.mockResolvedValue(makePage([championsCourt]))
      renderList()

      await screen.findByRole('link', { name: 'Testing Main Court' })

      await user.click(screen.getByTestId('discovery-court-trigger'))
      await screen.findByTestId('discovery-court-option-champions:12')
      expect(getOpenSheetParts().clearButton).toBeDisabled()

      await user.click(screen.getByTestId('discovery-court-option-champions:12'))
      await user.click(screen.getByTestId('discovery-day-trigger'))
      const selectedDate = await selectFirstAvailableDay(user)

      await user.click(screen.getByTestId('discovery-court-trigger'))
      await screen.findByTestId('discovery-court-option-champions:12')
      const { clearButton } = getOpenSheetParts()
      expect(clearButton).toBeEnabled()

      await user.click(clearButton)

      expect(screen.getByTestId('discovery-court-trigger')).toHaveTextContent('اختار ملعب معين')
      expect(screen.getByTestId('discovery-day-trigger')).not.toHaveTextContent('اختار اليوم')
      expect(mockedSearchPublicCourts).toHaveBeenLastCalledWith(
        { date: selectedDate, times: [], page: 1 },
        { signal: expect.any(AbortSignal) },
      )
      expect(getOpenSheetParts().clearButton).toBeDisabled()
    })

    it('Court selector: clearing the only filter restores default Phase 1 browsing', async () => {
      const user = userEvent.setup()
      mockedListPublicCourts.mockResolvedValue(makePage([makeCourt(), championsCourt]))
      mockedSearchPublicCourts.mockResolvedValue(makePage([championsCourt]))
      renderList()

      await screen.findByRole('link', { name: 'Testing Main Court' })

      await user.click(screen.getByTestId('discovery-court-trigger'))
      await user.click(await screen.findByTestId('discovery-court-option-champions:12'))
      expect(
        await screen.findByRole('heading', { level: 3, name: 'الملعب المختار' }),
      ).toBeInTheDocument()

      expect(screen.queryByRole('link', { name: 'Testing Main Court' })).not.toBeInTheDocument()

      await user.click(screen.getByTestId('discovery-court-trigger'))
      await screen.findByTestId('discovery-court-option-champions:12')
      await user.click(getOpenSheetParts().clearButton)
      await user.click(screen.getByRole('button', { name: 'إغلاق' }))

      // Only the default browse (`listPublicCourts`) returns this Court
      expect(await screen.findByRole('link', { name: 'Testing Main Court' })).toBeInTheDocument()
      expect(
        screen.queryByRole('heading', { level: 3, name: 'الملعب المختار' }),
      ).not.toBeInTheDocument()
      expect(mockedSearchPublicCourts).toHaveBeenCalledTimes(1)
    })

    it('Day selector: مسح الاختيار is disabled without a day; clearing removes the day and its times and keeps the Court filter', async () => {
      const user = userEvent.setup()
      mockedListPublicCourts.mockResolvedValue(makePage([makeCourt(), championsCourt]))
      mockedSearchPublicCourts.mockResolvedValue(makePage([championsCourt]))
      renderList()

      await screen.findByRole('link', { name: 'Testing Main Court' })

      await user.click(screen.getByTestId('discovery-day-trigger'))
      await screen.findAllByTestId(/^discovery-day-option-/)
      expect(getOpenSheetParts().clearButton).toBeDisabled()
      await user.click(screen.getByRole('button', { name: 'إغلاق' }))

      await user.click(screen.getByTestId('discovery-court-trigger'))
      await user.click(await screen.findByTestId('discovery-court-option-champions:12'))
      await user.click(screen.getByTestId('discovery-day-trigger'))
      await selectFirstAvailableDay(user)
      await user.click(screen.getByTestId('discovery-times-trigger'))
      await user.click(screen.getByTestId('discovery-time-slot-18:00'))
      await user.click(screen.getByTestId('discovery-time-sheet-done'))

      await user.click(screen.getByTestId('discovery-day-trigger'))
      const { clearButton } = getOpenSheetParts()
      expect(clearButton).toBeEnabled()

      await user.click(clearButton)

      expect(screen.getByTestId('discovery-day-trigger')).toHaveTextContent('اختار اليوم')
      expect(screen.getByTestId('discovery-times-trigger')).toHaveTextContent('اختار المواعيد')
      expect(screen.getByTestId('discovery-court-trigger')).toHaveTextContent('ملعب الأبطال')
      expect(mockedSearchPublicCourts).toHaveBeenLastCalledWith(
        { date: null, times: [], courtId: 12, page: 1 },
        { signal: expect.any(AbortSignal) },
      )
      expect(getOpenSheetParts().clearButton).toBeDisabled()
    })

    it('Times selector: مسح الاختيار is disabled without times; clearing keeps the day and runs a day-only search', async () => {
      const user = userEvent.setup()
      mockedListPublicCourts.mockResolvedValue(makePage([makeCourt()]))
      mockedSearchPublicCourts.mockResolvedValue(makePage([]))
      renderList()

      await screen.findByRole('link', { name: 'Testing Main Court' })

      await user.click(screen.getByTestId('discovery-day-trigger'))
      const selectedDate = await selectFirstAvailableDay(user)
      await user.click(screen.getByTestId('discovery-times-trigger'))

      expect(getOpenSheetParts().clearButton).toBeDisabled()

      await user.click(screen.getByTestId('discovery-time-slot-10:00'))
      await user.click(screen.getByTestId('discovery-time-slot-18:00'))
      const { clearButton } = getOpenSheetParts()
      expect(clearButton).toBeEnabled()

      await user.click(clearButton)

      expect(screen.getByTestId('discovery-time-slot-10:00')).toHaveAttribute('aria-pressed', 'false')
      expect(screen.getByTestId('discovery-time-slot-18:00')).toHaveAttribute('aria-pressed', 'false')
      expect(screen.getByTestId('discovery-times-trigger')).toHaveTextContent('اختار المواعيد')
      expect(screen.getByTestId('discovery-day-trigger')).not.toHaveTextContent('اختار اليوم')
      expect(mockedSearchPublicCourts).toHaveBeenLastCalledWith(
        { date: selectedDate, times: [], page: 1 },
        { signal: expect.any(AbortSignal) },
      )
      expect(getOpenSheetParts().clearButton).toBeDisabled()
    })

    it('closing a selector with × only closes it: no selection is cleared or applied', async () => {
      const user = userEvent.setup()
      mockedListPublicCourts.mockResolvedValue(makePage([makeCourt()]))
      mockedSearchPublicCourts.mockResolvedValue(makePage([]))
      renderList()

      await screen.findByRole('link', { name: 'Testing Main Court' })

      await user.click(screen.getByTestId('discovery-day-trigger'))
      await selectFirstAvailableDay(user)
      const searchCallsBeforeClose = mockedSearchPublicCourts.mock.calls.length

      await user.click(screen.getByTestId('discovery-day-trigger'))
      await user.click(screen.getByRole('button', { name: 'إغلاق' }))

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(screen.getByTestId('discovery-day-trigger')).not.toHaveTextContent('اختار اليوم')
      expect(mockedSearchPublicCourts).toHaveBeenCalledTimes(searchCallsBeforeClose)
    })

    it('has no clear-all مسح الاختيارات in the filter bar, even with filters active', async () => {
      const user = userEvent.setup()
      mockedListPublicCourts.mockResolvedValue(makePage([makeCourt(), championsCourt]))
      mockedSearchPublicCourts.mockResolvedValue(makePage([championsCourt]))
      renderList()

      await screen.findByRole('link', { name: 'Testing Main Court' })

      await user.click(screen.getByTestId('discovery-court-trigger'))
      await user.click(await screen.findByTestId('discovery-court-option-champions:12'))
      await user.click(screen.getByTestId('discovery-day-trigger'))
      await selectFirstAvailableDay(user)

      const filterBar = screen.getByTestId('discovery-filter-bar')
      expect(within(filterBar).getAllByRole('button')).toHaveLength(3)
      expect(screen.queryByRole('button', { name: 'مسح الاختيارات' })).not.toBeInTheDocument()
      expect(screen.queryByTestId('discovery-clear-button')).not.toBeInTheDocument()
    })

    it('pins مسح الاختيار in a footer outside the scrollable options in all three selectors', async () => {
      const user = userEvent.setup()
      mockedListPublicCourts.mockResolvedValue(makePage([makeCourt(), championsCourt]))
      mockedSearchPublicCourts.mockResolvedValue(makePage([]))
      renderList()

      await screen.findByRole('link', { name: 'Testing Main Court' })

      // Court selector
      await user.click(screen.getByTestId('discovery-court-trigger'))
      const courtOptionsList = await screen.findByTestId('discovery-court-options-list')
      let parts = getOpenSheetParts()
      expect(parts.body).toContainElement(courtOptionsList)
      expect(parts.footer).toContainElement(parts.clearButton)
      expect(parts.body).not.toContainElement(parts.clearButton)
      expect(courtOptionsList).not.toContainElement(parts.clearButton)
      await user.click(screen.getByRole('button', { name: 'إغلاق' }))

      // Day selector
      await user.click(screen.getByTestId('discovery-day-trigger'))
      const [firstDayOption] = await screen.findAllByTestId(/^discovery-day-option-/)
      parts = getOpenSheetParts()
      expect(parts.body).toContainElement(firstDayOption!)
      expect(parts.footer).toContainElement(parts.clearButton)
      expect(parts.body).not.toContainElement(parts.clearButton)

      // Times selector (day picked from the day sheet, then times)
      await user.click(firstDayOption!)
      await user.click(screen.getByTestId('discovery-times-trigger'))
      parts = getOpenSheetParts()
      expect(parts.body).toContainElement(screen.getByTestId('discovery-time-slot-18:00'))
      expect(parts.footer).toContainElement(parts.clearButton)
      expect(parts.body).not.toContainElement(parts.clearButton)
      expect(within(parts.dialog).getAllByRole('button', { name: 'مسح الاختيار' })).toHaveLength(1)
    })

    it('handles 50 Court options: options scroll in the body, the footer stays rendered, and selecting still works', async () => {
      const user = userEvent.setup()
      const fiftyCourts = Array.from({ length: 50 }, (_, index) =>
        makeCourt({
          courtId: index + 1,
          clubSlug: `club-${index + 1}`,
          courtName: `ملعب رقم ${index + 1}`,
        }),
      )
      mockedListPublicCourts.mockResolvedValue(makePage(fiftyCourts))
      mockedSearchPublicCourts.mockResolvedValue(makePage([fiftyCourts[36]!]))
      renderList()

      await screen.findByRole('link', { name: 'ملعب رقم 1' })

      await user.click(screen.getByTestId('discovery-court-trigger'))
      const optionsList = await screen.findByTestId('discovery-court-options-list')
      const parts = getOpenSheetParts()

      expect(within(optionsList).getAllByRole('button')).toHaveLength(50)
      expect(parts.body).toContainElement(optionsList)
      expect(parts.body).not.toContainElement(parts.footer)
      expect(parts.footer).toContainElement(parts.clearButton)
      expect(parts.clearButton).toBeDisabled()

      await user.click(within(optionsList).getByRole('button', { name: 'ملعب رقم 37' }))

      expect(screen.getByTestId('discovery-court-trigger')).toHaveTextContent('ملعب رقم 37')
      expect(mockedSearchPublicCourts).toHaveBeenLastCalledWith(
        { date: null, times: [], courtId: 37, page: 1 },
        { signal: expect.any(AbortSignal) },
      )
    })
  })
})
