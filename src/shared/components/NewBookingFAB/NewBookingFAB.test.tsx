import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { NewBookingFAB } from './NewBookingFAB'

describe('NewBookingFAB', () => {
  it('renders the Arabic new booking label', () => {
    render(<NewBookingFAB />)

    expect(screen.getByRole('button', { name: 'حجز جديد' })).toBeInTheDocument()
  })
})
