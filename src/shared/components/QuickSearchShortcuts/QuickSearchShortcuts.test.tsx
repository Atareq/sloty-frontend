import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { QuickSearchShortcuts } from './QuickSearchShortcuts'

describe('QuickSearchShortcuts', () => {
  it('starts collapsed and expands on demand', async () => {
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
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('checkbox')).toBeInTheDocument()
  })

  it('collapses when live search has a meaningful query', async () => {
    const user = userEvent.setup()
    const { rerender } = render(
      <QuickSearchShortcuts>
        <p>فلاتر</p>
      </QuickSearchShortcuts>,
    )

    await user.click(screen.getByRole('button', { name: 'اختصارات البحث السريع' }))
    expect(screen.getByText('فلاتر')).toBeInTheDocument()

    rerender(
      <QuickSearchShortcuts collapseWhen>
        <p>فلاتر</p>
      </QuickSearchShortcuts>,
    )

    expect(
      screen.getByRole('button', { name: 'اختصارات البحث السريع' }),
    ).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('فلاتر')).not.toBeInTheDocument()
  })
})
