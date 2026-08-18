import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { AppDateNavigator } from './AppDateNavigator'

function ControlledNavigator({ initialValue }: { initialValue: string }) {
  const [value, setValue] = useState(initialValue)

  return <AppDateNavigator onChange={setValue} value={value} />
}

function getStripButtons(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>('button[aria-pressed]'),
  )
}

async function clickCalendarDay(user: ReturnType<typeof userEvent.setup>, day: string) {
  await screen.findByRole('dialog', { name: 'اختيار تاريخ الحجز' })

  const dayButton = Array.from(
    document.querySelectorAll<HTMLButtonElement>('button'),
  ).find((button) => button.textContent?.trim() === day)

  expect(dayButton).toBeDefined()
  await user.click(dayButton as HTMLButtonElement)
}

describe('AppDateNavigator', () => {
  it('renders seven rolling dates and marks the selected value', () => {
    render(<AppDateNavigator onChange={vi.fn()} value="2026-08-16" />)

    expect(screen.getAllByRole('button', { pressed: false })).toHaveLength(6)
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

    await user.click(screen.getByRole('button', { name: 'فتح تقويم تاريخ الحجز' }))
    await clickCalendarDay(user, '25')

    expect(handleChange).toHaveBeenLastCalledWith('2026-08-25')
  })

  it('keeps the visible range stable when clicking an already visible date', async () => {
    const user = userEvent.setup()

    const { container } = render(<ControlledNavigator initialValue="2026-08-16" />)

    const buttons = getStripButtons(container)
    expect(buttons[0]).toHaveTextContent('١٦')
    expect(buttons[6]).toHaveTextContent('٢٢')

    await user.click(buttons[3])

    const nextButtons = getStripButtons(container)
    expect(nextButtons[0]).toHaveTextContent('١٦')
    expect(nextButtons[3]).toHaveAttribute('aria-pressed', 'true')
    expect(nextButtons[6]).toHaveTextContent('٢٢')
  })

  it('rebuilds the visible range from a calendar-selected outside date', async () => {
    const user = userEvent.setup()

    const { container } = render(<ControlledNavigator initialValue="2026-08-16" />)

    await user.click(screen.getByRole('button', { name: 'فتح تقويم تاريخ الحجز' }))
    await clickCalendarDay(user, '25')

    const buttons = getStripButtons(container)

    expect(buttons[0]).toHaveTextContent('٢٥')
    expect(buttons[0]).toHaveAttribute('aria-pressed', 'true')
    expect(buttons[6]).toHaveTextContent('٣١')
    expect(screen.getByRole('button', { name: 'فتح تقويم تاريخ الحجز' }))
      .toBeInTheDocument()
  })
})
