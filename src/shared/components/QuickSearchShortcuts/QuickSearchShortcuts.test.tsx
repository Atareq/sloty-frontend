import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { QuickSearchShortcuts } from './QuickSearchShortcuts'

describe('QuickSearchShortcuts', () => {
  it('starts collapsed and toggles open and closed', async () => {
    const user = userEvent.setup()

    render(
      <QuickSearchShortcuts>
        <label>
          الحجوزات القادمة فقط
          <input type="checkbox" />
        </label>
      </QuickSearchShortcuts>,
    )

    const toggle = screen.getByRole('button', { name: 'اختصارات البحث السريع' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toBeEnabled()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('checkbox')).toBeInTheDocument()

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })

  it('auto-collapses when the live query becomes meaningful, then stays clickable', async () => {
    const user = userEvent.setup()
    const { rerender } = render(
      <QuickSearchShortcuts searchQuery="">
        <p>فلاتر</p>
      </QuickSearchShortcuts>,
    )

    const toggle = screen.getByRole('button', { name: 'اختصارات البحث السريع' })
    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('فلاتر')).toBeInTheDocument()

    rerender(
      <QuickSearchShortcuts searchQuery="Ahmed">
        <p>فلاتر</p>
      </QuickSearchShortcuts>,
    )

    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toBeEnabled()
    expect(screen.queryByText('فلاتر')).not.toBeInTheDocument()

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('فلاتر')).toBeInTheDocument()

    rerender(
      <QuickSearchShortcuts searchQuery="Ahmeds">
        <p>فلاتر</p>
      </QuickSearchShortcuts>,
    )

    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toBeEnabled()
    expect(screen.queryByText('فلاتر')).not.toBeInTheDocument()
  })
})
