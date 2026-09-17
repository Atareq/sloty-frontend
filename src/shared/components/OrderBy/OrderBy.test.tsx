import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { OrderBy, OrderByButton } from './OrderBy'

describe('OrderBy component', () => {
  it('renders with descending label by default and toggles to asc on click', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <OrderBy
        ariaLabelPrefix="ترتيب السجل"
        ascendingLabel="الأقدم أولاً"
        descendingLabel="الأحدث أولاً"
        onChange={onChange}
        value="desc"
      />,
    )

    const button = screen.getByRole('button', {
      name: 'ترتيب السجل: الأحدث أولاً',
    })
    expect(button).toBeInTheDocument()
    expect(button).toHaveTextContent('الأحدث أولاً')

    await user.click(button)
    expect(onChange).toHaveBeenCalledWith('asc')
  })

  it('renders with ascending label and toggles to desc on click', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <OrderByButton
        ariaLabelPrefix="ترتيب المعاملات"
        ascendingLabel="الأقدم أولاً"
        descendingLabel="الأحدث أولاً"
        onChange={onChange}
        value="asc"
      />,
    )

    const button = screen.getByRole('button', {
      name: 'ترتيب المعاملات: الأقدم أولاً',
    })
    expect(button).toHaveTextContent('الأقدم أولاً')

    await user.click(button)
    expect(onChange).toHaveBeenCalledWith('desc')
  })

  it('does not invoke onChange when disabled', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <OrderBy
        ascendingLabel="الأقدم أولاً"
        descendingLabel="الأحدث أولاً"
        disabled
        onChange={onChange}
        value="desc"
      />,
    )

    const button = screen.getByRole('button', { name: 'الأحدث أولاً' })
    expect(button).toBeDisabled()

    await user.click(button)
    expect(onChange).not.toHaveBeenCalled()
  })
})

