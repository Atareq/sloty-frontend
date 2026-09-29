import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it } from 'vitest'
import { PublicHomePage } from '../PublicHomePage/PublicHomePage'
import { AssiutPage } from './AssiutPage'

function renderAssiut() {
  return render(
    <MemoryRouter initialEntries={['/assiut/']}>
      <Routes>
        <Route element={<PublicHomePage />} path="/" />
        <Route element={<AssiutPage />} path="/assiut" />
      </Routes>
    </MemoryRouter>,
  )
}

describe('AssiutPage', () => {
  it('renders one Assiut H1', () => {
    renderAssiut()

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(
      screen.getByRole('heading', { level: 1, name: 'ملاعب كرة القدم والحجز في أسيوط' }),
    ).toBeInTheDocument()
  })

  it('explains player availability and owner/staff management, not only booking', () => {
    renderAssiut()

    expect(screen.getByRole('heading', { name: 'للاعبين: اعرف المواعيد المتاحة' }))
      .toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'لأصحاب الملاعب وفريق العمل' }))
      .toBeInTheDocument()
    expect(document.body.textContent).toContain('ليست صفحة حجز للاعبين فقط')
  })

  it('shows no invented clubs, courts, or availability', () => {
    renderAssiut()

    expect(screen.queryByTestId('public-slot-card')).not.toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/\d{1,2}:\d{2}/)
    expect(screen.queryByRole('link', { name: /ملعب .*جدول/ })).not.toBeInTheDocument()
  })

  it('renders a breadcrumb back to the Sloty homepage', () => {
    renderAssiut()

    const breadcrumb = screen.getByRole('navigation', { name: 'مسار الصفحة' })
    expect(within(breadcrumb).getByRole('link', { name: 'Sloty' })).toHaveAttribute('href', '/')
    expect(within(breadcrumb).getByText('أسيوط')).toHaveAttribute('aria-current', 'page')
  })

  it('links back to the homepage with descriptive anchor text', async () => {
    const user = userEvent.setup()
    renderAssiut()

    await user.click(screen.getByRole('link', { name: 'سلوتي لإدارة وحجز ملاعب كرة القدم' }))

    expect(
      screen.getByRole('heading', { level: 1, name: 'إدارة وحجز الملاعب بسهولة مع Sloty' }),
    ).toBeInTheDocument()
  })
})
