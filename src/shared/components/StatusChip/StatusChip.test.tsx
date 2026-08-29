import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StatusChip } from './StatusChip'

describe('StatusChip', () => {
  it('renders the label for the provided status', () => {
    render(<StatusChip status="confirmed" />)

    expect(screen.getByText('العربون مدفوع')).toBeInTheDocument()
  })

  it('applies the tone classes for the provided status', () => {
    render(<StatusChip status="cancelled" />)

    expect(screen.getByText('ملغي')).toHaveClass(
      'bg-[var(--sloty-danger-soft)]',
      'text-[var(--sloty-danger)]',
    )
  })

  it('uses canonical booking status labels for NO_SHOW and EXPIRED', () => {
    const { rerender } = render(<StatusChip status="NO_SHOW" />)
    expect(screen.getByText('عدم حضور')).toBeInTheDocument()
    expect(screen.queryByText('لم يحضر')).not.toBeInTheDocument()

    rerender(<StatusChip status="EXPIRED" />)
    expect(screen.getByText('انتهت المهلة')).toBeInTheDocument()
    expect(screen.queryByText('منتهي')).not.toBeInTheDocument()
  })
})
