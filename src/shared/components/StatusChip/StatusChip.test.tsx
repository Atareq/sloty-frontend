import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StatusChip } from './StatusChip'

describe('StatusChip', () => {
  it('renders the label for the provided status', () => {
    render(<StatusChip status="confirmed" />)

    expect(screen.getByText('مؤكد')).toBeInTheDocument()
  })

  it('applies the tone classes for the provided status', () => {
    render(<StatusChip status="cancelled" />)

    expect(screen.getByText('ملغي')).toHaveClass(
      'bg-[var(--sloty-danger-soft)]',
      'text-[var(--sloty-danger)]',
    )
  })
})
