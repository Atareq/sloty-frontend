import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { listPublicCourts } from '../../publicDiscovery/publicDiscoveryApi'
import { AboutPage } from '../AboutPage/AboutPage'
import { PublicHomePage } from './PublicHomePage'

vi.mock('../../publicDiscovery/publicDiscoveryApi', () => ({
  listPublicCourts: vi.fn(),
  searchPublicCourts: vi.fn(),
}))

const mockedListPublicCourts = vi.mocked(listPublicCourts)

function renderPublicSite(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<PublicHomePage />} path="/" />
        <Route element={<AboutPage />} path="/about" />
        <Route element={<p>صفحة تسجيل الدخول</p>} path="/login" />
        <Route
          element={<p>جدول الملعب العام</p>}
          path="/public/:clubSlug/courts/:courtId/schedule"
        />
      </Routes>
    </MemoryRouter>,
  )
}

function precedes(first: Element, second: Element): boolean {
  return Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING)
}

describe('PublicHomePage (public discovery)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedListPublicCourts.mockResolvedValue({
      courts: [
        {
          key: 'testing:1',
          courtId: 1,
          courtName: 'Testing Main Court',
          clubSlug: 'testing',
          clubName: 'Testing Club',
          addressLabel: 'شارع عباس العقاد، القاهرة',
          imageUrl: null,
          matchingTimes: [],
        },
      ],
      totalCount: 1,
      hasNextPage: false,
    })
  })

  it('renders one H1 with the Sloty identity before the Courts', async () => {
    renderPublicSite()

    const h1 = screen.getByRole('heading', { level: 1, name: 'سلوتي لحجز ملاعب كرة القدم' })
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    const intro = screen.getByText(/^سلوتي \(Sloty\) منصة مصرية لحجز وإدارة الملاعب/)
    const courtsHeading = screen.getByRole('heading', {
      level: 2,
      name: 'ملاعب كرة القدم',
    })
    const courtLink = await screen.findByRole('link', { name: 'Testing Main Court' })
    const aboutHeading = screen.getByRole('heading', { level: 2, name: 'تعرّف على سلوتي' })

    expect(precedes(h1, intro)).toBe(true)
    expect(precedes(intro, courtsHeading)).toBe(true)
    expect(precedes(courtsHeading, courtLink)).toBe(true)
    expect(precedes(courtLink, aboutHeading)).toBe(true)
  })

  it('loads real Courts from the public discovery API', async () => {
    renderPublicSite()

    expect(await screen.findByRole('link', { name: 'Testing Main Court' })).toHaveAttribute(
      'href',
      '/public/testing/courts/1/schedule',
    )
    expect(mockedListPublicCourts).toHaveBeenCalledWith(
      { page: 1 },
      { signal: expect.any(AbortSignal) },
    )
  })

  it('takes a visitor from a Court card to its existing public schedule', async () => {
    const user = userEvent.setup()
    renderPublicSite()

    await user.click(await screen.findByRole('link', { name: 'Testing Main Court' }))

    expect(screen.getByText('جدول الملعب العام')).toBeInTheDocument()
  })

  it('keeps the identity short and does not promise player self-booking', () => {
    renderPublicSite()

    const text = document.body.textContent ?? ''
    for (const term of ['Sloty', 'سلوتي', 'ملاعب كرة القدم', 'مواعيد الملاعب المتاحة']) {
      expect(text).toContain(term)
    }
    expect(text).toContain('تواصل مع الملعب لتأكيد الحجز')
    expect(text).not.toContain('احجز بنفسك')
    expect(screen.queryByRole('heading', { name: 'نظام متكامل لأصحاب الملاعب وفريق العمل' }))
      .not.toBeInTheDocument()
  })

  it('links to the About page with a canonical path', async () => {
    const user = userEvent.setup()
    renderPublicSite()

    const aboutLinks = screen.getAllByRole('link', { name: 'عن سلوتي' })
    for (const link of aboutLinks) {
      expect(link).toHaveAttribute('href', '/about/')
    }

    await user.click(aboutLinks[0])
    expect(screen.getByRole('heading', { level: 1, name: 'عن سلوتي' })).toBeInTheDocument()
  })

  it('offers staff login as a nofollow link', async () => {
    const user = userEvent.setup()
    renderPublicSite()

    const headerLogin = within(screen.getByRole('banner')).getByRole('link', {
      name: 'تسجيل الدخول',
    })
    expect(headerLogin).toHaveAttribute('href', '/login')
    expect(headerLogin).toHaveAttribute('rel', 'nofollow')

    await user.click(headerLogin)
    expect(screen.getByText('صفحة تسجيل الدخول')).toBeInTheDocument()
  })

  it('exposes footer navigation between public pages with the current page marked', () => {
    renderPublicSite()

    const footerNav = screen.getByRole('navigation', { name: 'روابط سلوتي' })
    expect(within(footerNav).getByRole('link', { name: 'الرئيسية' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(within(footerNav).getByRole('link', { name: 'عن سلوتي' })).toHaveAttribute(
      'href',
      '/about/',
    )
    expect(
      within(footerNav).getByRole('link', { name: 'تسجيل الدخول لفريق العمل' }),
    ).toHaveAttribute('rel', 'nofollow')
  })

  it('has no staff login card in the page content; staff login stays in the header and footer only', () => {
    renderPublicSite()

    const main = screen.getByRole('main')
    expect(screen.queryByText('تعمل في ملعب يستخدم سلوتي؟')).not.toBeInTheDocument()
    expect(
      screen.queryByText('سجّل الدخول لمتابعة جدول الملعب وإدارة الحجوزات والمدفوعات.'),
    ).not.toBeInTheDocument()
    expect(
      within(main).queryByRole('link', { name: /تسجيل الدخول/ }),
    ).not.toBeInTheDocument()
    expect(
      within(screen.getByRole('banner')).getByRole('link', { name: 'تسجيل الدخول' }),
    ).toHaveAttribute('href', '/login')
  })
})
