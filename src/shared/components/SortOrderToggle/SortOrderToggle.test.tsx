import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SortOrderToggle } from './SortOrderToggle'

describe('SortOrderToggle', () => {
  it('renders descending state with descending label and calls onChange with asc on click', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()

    render(
      <SortOrderToggle
        ascendingLabel="الأقدم أولاً"
        descendingLabel="الأحدث أولاً"
        onChange={handleChange}
        value="desc"
      />,
    )

    const button = screen.getByRole('button', { name: 'الأحدث أولاً' })
    expect(button).toBeInTheDocument()
    expect(button).toBeEnabled()
    expect(screen.getByText('الأحدث أولاً')).toBeInTheDocument()
    expect(screen.queryByText('الأقدم أولاً')).not.toBeInTheDocument()

    await user.click(button)
    expect(handleChange).toHaveBeenCalledTimes(1)
    expect(handleChange).toHaveBeenCalledWith('asc')
  })

  it('renders ascending state with ascending label and calls onChange with desc on click', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()

    render(
      <SortOrderToggle
        ascendingLabel="الأقدم أولاً"
        descendingLabel="الأحدث أولاً"
        onChange={handleChange}
        value="asc"
      />,
    )

    const button = screen.getByRole('button', { name: 'الأقدم أولاً' })
    expect(button).toBeInTheDocument()
    expect(button).toBeEnabled()
    expect(screen.getByText('الأقدم أولاً')).toBeInTheDocument()
    expect(screen.queryByText('الأحدث أولاً')).not.toBeInTheDocument()

    await user.click(button)
    expect(handleChange).toHaveBeenCalledTimes(1)
    expect(handleChange).toHaveBeenCalledWith('desc')
  })

  it('prevents clicks and retains disabled state when disabled', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()

    render(
      <SortOrderToggle
        ascendingLabel="الأقدم أولاً"
        descendingLabel="الأحدث أولاً"
        disabled
        onChange={handleChange}
        value="desc"
      />,
    )

    const button = screen.getByRole('button', { name: 'الأحدث أولاً' })
    expect(button).toBeDisabled()

    await user.click(button)
    expect(handleChange).not.toHaveBeenCalled()
  })

  it('exposes prefix in aria-label when ariaLabelPrefix is provided', () => {
    render(
      <SortOrderToggle
        ariaLabelPrefix="ترتيب الحجوزات"
        ascendingLabel="الأقدم أولاً"
        descendingLabel="الأحدث أولاً"
        onChange={vi.fn()}
        value="desc"
      />,
    )

    expect(
      screen.getByRole('button', { name: 'ترتيب الحجوزات: الأحدث أولاً' }),
    ).toBeInTheDocument()
  })

  it('applies custom className when provided', () => {
    render(
      <SortOrderToggle
        ascendingLabel="الأقدم أولاً"
        className="custom-sort-toggle"
        descendingLabel="الأحدث أولاً"
        onChange={vi.fn()}
        value="desc"
      />,
    )

    const button = screen.getByRole('button', { name: 'الأحدث أولاً' })
    expect(button).toHaveClass('custom-sort-toggle')
  })

  it('supports compact presentation mode', () => {
    render(
      <SortOrderToggle
        ascendingLabel="الأقدم أولاً"
        compact
        descendingLabel="الأحدث أولاً"
        onChange={vi.fn()}
        value="desc"
      />,
    )

    const button = screen.getByRole('button', { name: 'الأحدث أولاً' })
    expect(button).toHaveClass('min-h-9')
    expect(button).toHaveClass('text-xs')
    expect(button).toHaveClass('shrink-0')
  })
})
