import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BookingDetailTimeRange } from './BookingDetailTimeRange'

describe('BookingDetailTimeRange', () => {
  it.each([
    ['midnight', '00:00', '01:00', '01:00 AM - 12:00 AM', 'منتصف الليل'],
    ['noon', '12:00', '13:00', '01:00 PM - 12:00 PM', 'ظهرًا'],
  ])(
    'renders %s context beside the protected end-start range',
    (_label, startTime, endTime, expectedRange, expectedClarification) => {
      render(
        <BookingDetailTimeRange
          endTime={endTime}
          fallbackText="fallback"
          startTime={startTime}
        />,
      )

      const range = screen.getByText(expectedRange)
      expect(range).toHaveAttribute('dir', 'ltr')
      expect(range.parentElement).toHaveAttribute('dir', 'rtl')
      expect(range.parentElement).toHaveClass(
        'flex',
        'w-full',
        'items-center',
        'justify-between',
      )
      expect(screen.getByText(expectedClarification).parentElement).toHaveClass(
        'shrink-0',
      )
    },
  )

  it('renders a normal range without a contextual label', () => {
    render(
      <BookingDetailTimeRange
        endTime="19:00"
        fallbackText="fallback"
        startTime="18:00"
      />,
    )

    expect(screen.getByText('07:00 PM - 06:00 PM')).toBeInTheDocument()
    expect(screen.queryByText('منتصف الليل')).not.toBeInTheDocument()
    expect(screen.queryByText('ظهرًا')).not.toBeInTheDocument()
  })
})
