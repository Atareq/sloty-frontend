import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SchedulePage } from './SchedulePage'

describe('SchedulePage', () => {
  it('renders the Arabic schedule header', () => {
    render(<SchedulePage />)

    expect(screen.getByText('جدول اليوم')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'نادي النصر - ملعب 1' }))
      .toBeInTheDocument()
    expect(screen.getByText('لوحة الملعب')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: '06:00 م - 07:00 م متاح' }),
    ).toBeInTheDocument()
  })
})
