import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RouteScrollReset } from './RouteScrollReset'

function NavigationHarness() {
  const navigate = useNavigate()

  return (
    <>
      <RouteScrollReset />
      <button onClick={() => navigate('/settings')} type="button">
        الإعدادات
      </button>
      <button onClick={() => navigate('/bookings?search=ahmed')} type="button">
        بحث
      </button>
      <button onClick={() => navigate('/bookings#needs-action')} type="button">
        قسم
      </button>
      <div id="needs-action">محتاجين إجراء</div>
    </>
  )
}

describe('RouteScrollReset', () => {
  beforeEach(() => {
    window.scrollTo = vi.fn()
    Element.prototype.scrollIntoView = vi.fn()
  })

  it('resets window scroll on pathname changes and preserves hash targets', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/bookings']}>
        <Routes>
          <Route element={<NavigationHarness />} path="*" />
        </Routes>
      </MemoryRouter>,
    )

    expect(window.scrollTo).toHaveBeenCalledWith(0, 0)
    vi.mocked(window.scrollTo).mockClear()

    await user.click(screen.getByRole('button', { name: 'بحث' }))
    expect(window.scrollTo).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'الإعدادات' }))
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0)
    vi.mocked(window.scrollTo).mockClear()

    await user.click(screen.getByRole('button', { name: 'قسم' }))
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled()
    expect(window.scrollTo).not.toHaveBeenCalled()
  })
})
