import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MobileBottomNav } from './MobileBottomNav'

describe('MobileBottomNav', () => {
  it('renders staff navigation labels', () => {
    render(<MobileBottomNav />)

    expect(screen.getByText('الجدول')).toBeInTheDocument()
    expect(screen.getByText('الحجوزات')).toBeInTheDocument()
    expect(screen.getByText('المدفوعات')).toBeInTheDocument()
    expect(screen.getByText('المزيد')).toBeInTheDocument()
  })
})
