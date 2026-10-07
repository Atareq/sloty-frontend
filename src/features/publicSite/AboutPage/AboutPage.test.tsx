import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { slotyContactLinks } from '../../../shared/config/contact'
import { listPublicCourts } from '../../publicDiscovery/publicDiscoveryApi'
import { PublicHomePage } from '../PublicHomePage/PublicHomePage'
import { homePageCopy, publicSiteIdentityCopy } from '../publicSite.copy'
import { AboutPage } from './AboutPage'

vi.mock('../../publicDiscovery/publicDiscoveryApi', () => ({
  listPublicCourts: vi.fn(),
}))

const mockedListPublicCourts = vi.mocked(listPublicCourts)

function renderAbout() {
  return render(
    <MemoryRouter initialEntries={['/about/']}>
      <Routes>
        <Route element={<PublicHomePage />} path="/" />
        <Route element={<AboutPage />} path="/about" />
      </Routes>
    </MemoryRouter>,
  )
}

function getMain() {
  return screen.getByRole('main')
}

describe('AboutPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedListPublicCourts.mockResolvedValue({
      courts: [],
      totalCount: 0,
      hasNextPage: false,
    })
  })

  afterEach(async () => {
    // Let AppSheet release its shared overlay/history registration.
    await new Promise((resolve) => window.setTimeout(resolve, 0))
  })

  it('keeps one H1 and renders only the approved sections, in order', () => {
    renderAbout()

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: 'عن سلوتي' })).toBeInTheDocument()

    const sectionHeadings = within(getMain())
      .getAllByRole('heading', { level: 2 })
      .map((heading) => heading.textContent)

    expect(sectionHeadings).toEqual([
      'إحنا Sloty ⚽️',
      'من نحن؟',
      'ليه Sloty؟',
      'مين Sloty ليه؟',
      'هدفنا',
      'مجاني 100% 🤍',
      'عايز تبدأ مع Sloty؟',
    ])
  })

  it('renders the exact approved copy', () => {
    renderAbout()

    const main = getMain()

    for (const text of [
      'منصة مصرية بنخلي إدارة الملاعب أبسط وأسهل.',
      'بدأنا من أسيوط، والهدف أكبر من أسيوط. 🇪🇬',
      'Sloty منصة بدأت من أسيوط لمساعدة أصحاب الملاعب وفريق العمل على إدارة ملعبهم بسهولة.',
      'لأن إدارة الملعب فيها تفاصيل كتير كل يوم، وإحنا بنحاول نخلي التعامل معاها أبسط.',
      'إن التكنولوجيا تكون متاحة لكل صاحب ملعب.',
      'إدارة ملعبك من غير اشتراك.',
    ]) {
      expect(
        within(main).getByText((_, element) => element?.tagName === 'P' && element.textContent === text),
      ).toBeInTheDocument()
    }

    const audiencesSection = within(main)
      .getByRole('heading', { level: 2, name: 'مين Sloty ليه؟' })
      .closest('section')!
    const audiences = within(audiencesSection)
      .getAllByRole('listitem')
      .map((item) => item.textContent)
    expect(audiences).toEqual(['🏟️ أصحاب الملاعب وفريق العمل', '⚽️ اللاعبين'])
  })

  it('marks emoji as decorative so the text carries the meaning', () => {
    renderAbout()

    expect(
      screen.getByRole('heading', { level: 2, name: 'إحنا Sloty' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 2, name: 'مجاني 100%' }),
    ).toBeInTheDocument()
    for (const emoji of within(getMain()).getAllByText(/^(⚽️|🇪🇬|🏟️|🤍)$/)) {
      expect(emoji).toHaveAttribute('aria-hidden', 'true')
    }
  })

  it('no longer renders the old feature catalog, principles, extra CTAs, or identity paragraph', () => {
    renderAbout()

    const main = getMain()

    for (const oldHeading of [
      'من هي سلوتي؟',
      'لماذا سلوتي؟',
      'رؤية سلوتي',
      'لمن صُممت سلوتي؟',
      'كيف تعمل سلوتي',
      'نظام متكامل لأصحاب الملاعب وفريق العمل',
    ]) {
      expect(within(main).queryByRole('heading', { name: oldHeading })).not.toBeInTheDocument()
    }
    expect(within(main).queryByText('حجز بالعربون')).not.toBeInTheDocument()
    expect(within(main).queryByText(publicSiteIdentityCopy.statement)).not.toBeInTheDocument()
    expect(within(main).queryByRole('link', { name: 'تصفح ملاعب كرة القدم' })).not.toBeInTheDocument()
    expect(within(main).queryByRole('link', { name: 'تسجيل الدخول لفريق العمل' })).not.toBeInTheDocument()
  })

  it('has exactly one primary CTA, ابدأ مجانًا, at the bottom of the content', () => {
    renderAbout()

    const main = getMain()
    const buttons = within(main).getAllByRole('button')

    expect(buttons).toHaveLength(1)
    expect(buttons[0]).toHaveAccessibleName('ابدأ مجانًا')
    expect(
      within(main).getByRole('heading', { level: 2, name: 'عايز تبدأ مع Sloty؟' }).closest('section'),
    ).toContainElement(buttons[0]!)
    // Only the breadcrumb link remains in the content; no competing actions.
    expect(within(main).getAllByRole('link').map((link) => link.textContent)).toEqual(['Sloty'])
  })

  it('opens the tiny contact sheet with the canonical tel: and mailto: links', async () => {
    const user = userEvent.setup()
    renderAbout()

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'ابدأ مجانًا' }))

    const dialog = screen.getByRole('dialog', { name: 'ابدأ مع Sloty' })
    expect(within(dialog).getByRole('heading', { name: 'ابدأ مع Sloty' })).toBeInTheDocument()
    expect(within(dialog).getByText('اختار الطريقة المناسبة ليك:')).toBeInTheDocument()

    const links = within(dialog).getAllByRole('link')
    expect(links).toHaveLength(2)
    expect(within(dialog).getByRole('link', { name: 'اتصل بنا' })).toHaveAttribute(
      'href',
      slotyContactLinks.phone,
    )
    expect(within(dialog).getByRole('link', { name: 'راسلنا' })).toHaveAttribute(
      'href',
      slotyContactLinks.email,
    )
    expect(slotyContactLinks.phone).toMatch(/^tel:\+\d+$/)
    expect(slotyContactLinks.email).toMatch(/^mailto:[^@\s]+@[^@\s]+$/)
    expect(within(dialog).queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('closes the contact sheet and leaves the About page in place', async () => {
    const user = userEvent.setup()
    renderAbout()

    await user.click(screen.getByRole('button', { name: 'ابدأ مجانًا' }))
    await user.click(screen.getByRole('button', { name: 'إغلاق' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'عن سلوتي' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'هدفنا' })).toBeInTheDocument()
  })

  it('keeps the shared public header, breadcrumb, and footer, lists no Courts, and calls no API', () => {
    renderAbout()

    expect(screen.getByRole('banner')).toBeInTheDocument()
    const breadcrumb = screen.getByRole('navigation', { name: 'مسار الصفحة' })
    expect(within(breadcrumb).getByRole('link', { name: 'Sloty' })).toHaveAttribute('href', '/')
    expect(within(breadcrumb).getByText('عن سلوتي')).toHaveAttribute('aria-current', 'page')

    const footerNav = screen.getByRole('navigation', { name: 'روابط سلوتي' })
    expect(within(footerNav).getByRole('link', { name: 'الرئيسية' })).toHaveAttribute('href', '/')
    expect(within(footerNav).getByRole('link', { name: 'عن سلوتي' })).toHaveAttribute('href', '/about/')

    expect(screen.queryByTestId('discovery-court-card')).not.toBeInTheDocument()
    expect(mockedListPublicCourts).not.toHaveBeenCalled()
  })

  it('keeps the Assiut origin story on About only: discovery and shared identity copy stay geography-neutral', () => {
    expect(JSON.stringify(homePageCopy)).not.toContain('أسيوط')
    expect(JSON.stringify(publicSiteIdentityCopy)).not.toContain('أسيوط')
  })
})
