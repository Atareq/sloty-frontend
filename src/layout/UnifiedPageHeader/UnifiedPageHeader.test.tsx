import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { UnifiedPageHeader } from './UnifiedPageHeader'

describe('UnifiedPageHeader', () => {
  it('renders Sloty, club name, page title, subtitle, and menu button', () => {
    const onMenuClick = vi.fn()

    render(
      <UnifiedPageHeader
        clubName="Demo Football Club"
        onMenuClick={onMenuClick}
        subtitle="ملخص اليوم ومؤشرات التشغيل"
        title="لوحة التحكم"
      />,
    )

    expect(screen.getByText('Sloty')).toBeInTheDocument()
    expect(screen.getByText('النادي الحالي: Demo Football Club'))
      .toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'لوحة التحكم' }))
      .toBeInTheDocument()
    expect(screen.getByText('ملخص اليوم ومؤشرات التشغيل')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'فتح القائمة' }))
      .toBeInTheDocument()
  })
})
