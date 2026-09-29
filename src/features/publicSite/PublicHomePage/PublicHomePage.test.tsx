import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it } from 'vitest'
import { AssiutPage } from '../AssiutPage/AssiutPage'
import { PublicHomePage } from './PublicHomePage'

function renderPublicSite(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<PublicHomePage />} path="/" />
        <Route element={<AssiutPage />} path="/assiut" />
        <Route element={<p>صفحة تسجيل الدخول</p>} path="/login" />
      </Routes>
    </MemoryRouter>,
  )
}

describe('PublicHomePage', () => {
  it('renders one H1 and crawlable Sloty identity content', () => {
    renderPublicSite()

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(
      screen.getByRole('heading', { level: 1, name: 'إدارة وحجز الملاعب بسهولة مع Sloty' }),
    ).toBeInTheDocument()
    const text = document.body.textContent ?? ''
    for (const term of ['Sloty', 'سلوتي', 'أسيوط', 'مصر', 'حجز وإدارة ملاعب كرة القدم', 'أصحاب الملاعب', 'فريق العمل', 'اللاعبون']) {
      expect(text).toContain(term)
    }
    expect(screen.getByText(/Egyptian platform for booking and managing football pitches/))
      .toHaveAttribute('lang', 'en')
  })

  it('does not promise player self-booking', () => {
    renderPublicSite()

    expect(document.body.textContent).toContain('تواصل مع الملعب لتأكيد الحجز')
    expect(document.body.textContent).not.toContain('احجز بنفسك')
  })

  it('links to the Assiut page with descriptive anchor text and a canonical path', () => {
    renderPublicSite()

    const assiutLinks = screen.getAllByRole('link', { name: 'حجز ملاعب كرة القدم في أسيوط' })
    expect(assiutLinks.length).toBeGreaterThan(0)
    for (const link of assiutLinks) {
      expect(link).toHaveAttribute('href', '/assiut/')
    }
  })

  it('navigates to the Assiut page through the internal link', async () => {
    const user = userEvent.setup()
    renderPublicSite()

    await user.click(screen.getAllByRole('link', { name: 'حجز ملاعب كرة القدم في أسيوط' })[0])

    expect(
      screen.getByRole('heading', { level: 1, name: 'ملاعب كرة القدم والحجز في أسيوط' }),
    ).toBeInTheDocument()
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
    expect(
      within(footerNav).getByRole('link', { name: 'حجز ملاعب كرة القدم في أسيوط' }),
    ).toHaveAttribute('href', '/assiut/')
  })
})
