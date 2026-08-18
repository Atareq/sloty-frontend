import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AppSelect } from './AppSelect'

const options = [
  { value: '', label: 'الكل' },
  { value: 'one', label: 'الخيار الأول' },
  { value: 'two', label: 'الخيار الثاني' },
]

describe('AppSelect', () => {
  it('renders the selected value and opens Sloty-styled options', async () => {
    const user = userEvent.setup()

    render(
      <AppSelect
        label="الحالة"
        onChange={vi.fn()}
        options={options}
        value="one"
      />,
    )

    await user.click(screen.getByRole('button', { name: /الحالة/ }))

    expect(screen.getByRole('listbox')).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'الخيار الأول' }))
      .toHaveAttribute('aria-selected', 'true')
  })

  it('selects with pointer and closes the menu', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()

    render(
      <AppSelect
        label="الحالة"
        onChange={handleChange}
        options={options}
        value=""
      />,
    )

    await user.click(screen.getByRole('button', { name: /الحالة/ }))
    await user.click(screen.getByRole('option', { name: 'الخيار الثاني' }))

    expect(handleChange).toHaveBeenCalledWith('two')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('supports keyboard navigation and Escape', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()

    render(
      <AppSelect
        ariaLabel="اختيار"
        onChange={handleChange}
        options={options}
        value=""
      />,
    )

    const trigger = screen.getByRole('button', { name: 'اختيار' })

    trigger.focus()
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}')

    expect(handleChange).toHaveBeenCalledWith('one')

    await user.keyboard('{ArrowDown}{Escape}')

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('renders loading, empty, and disabled states without selectable rows', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()

    const { rerender } = render(
      <AppSelect
        label="المستخدم"
        loading
        onChange={handleChange}
        options={[]}
        value=""
      />,
    )

    expect(screen.getByRole('button', { name: /المستخدم/ })).toBeDisabled()

    rerender(
      <AppSelect
        emptyLabel="لا توجد نتائج"
        label="المستخدم"
        onChange={handleChange}
        options={[]}
        value=""
      />,
    )

    await user.click(screen.getByRole('button', { name: /المستخدم/ }))

    expect(screen.getByRole('option', { name: 'لا توجد نتائج' }))
      .toHaveAttribute('aria-disabled', 'true')
    expect(handleChange).not.toHaveBeenCalled()
  })
})
