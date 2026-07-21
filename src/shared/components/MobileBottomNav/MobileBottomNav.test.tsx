import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MobileBottomNav } from './MobileBottomNav'

describe('MobileBottomNav', () => {
  it('renders the three daily destination labels by default', () => {
    render(<MobileBottomNav />)

    expect(screen.getByText('لوحة التحكم')).toBeInTheDocument()
    expect(screen.getByText('الجدول')).toBeInTheDocument()
    expect(screen.getByText('سجل الحجوزات')).toBeInTheDocument()
    expect(screen.queryByText('المزيد')).not.toBeInTheDocument()
  })
})
