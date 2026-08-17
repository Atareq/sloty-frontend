import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { AppDateNavigator } from './AppDateNavigator'

function ControlledNavigator({ initialValue }: { initialValue: string }) {
  const [value, setValue] = useState(initialValue)

  return <AppDateNavigator onChange={setValue} value={value} />
}

describe('AppDateNavigator', () => {
  it('renders seven rolling dates and marks the selected value', () => {
    render(<AppDateNavigator onChange={vi.fn()} value="2026-08-16" />)

    expect(screen.getAllByRole('button')).toHaveLength(7)
    expect(
      screen.getByRole('button', { pressed: true }),
    ).toBeInTheDocument()
  })

  it('calls onChange with YYYY-MM-DD from strip and calendar picker', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()

    render(<AppDateNavigator onChange={handleChange} value="2026-08-16" />)

    await user.click(screen.getAllByRole('button')[1])
    expect(handleChange).toHaveBeenCalledWith('2026-08-17')

    fireEvent.change(screen.getByLabelText('تاريخ الحجز'), {
      target: { value: '2026-08-25' },
    })
    expect(handleChange).toHaveBeenLastCalledWith('2026-08-25')
  })

  it('keeps the visible range stable when clicking an already visible date', async () => {
    const user = userEvent.setup()

    render(<ControlledNavigator initialValue="2026-08-16" />)

    const buttons = screen.getAllByRole('button')
    expect(buttons[0]).toHaveTextContent('١٦')
    expect(buttons[6]).toHaveTextContent('٢٢')

    await user.click(buttons[3])

    const nextButtons = screen.getAllByRole('button')
    expect(nextButtons[0]).toHaveTextContent('١٦')
    expect(nextButtons[3]).toHaveAttribute('aria-pressed', 'true')
    expect(nextButtons[6]).toHaveTextContent('٢٢')
  })

  it('rebuilds the visible range from a calendar-selected outside date', () => {
    render(<ControlledNavigator initialValue="2026-08-16" />)

    fireEvent.change(screen.getByLabelText('تاريخ الحجز'), {
      target: { value: '2026-08-25' },
    })

    const buttons = screen.getAllByRole('button')
    expect(buttons[0]).toHaveTextContent('٢٥')
    expect(buttons[0]).toHaveAttribute('aria-pressed', 'true')
    expect(buttons[6]).toHaveTextContent('٣١')
    expect(screen.getByLabelText('تاريخ الحجز')).toHaveValue('2026-08-25')
  })
})
