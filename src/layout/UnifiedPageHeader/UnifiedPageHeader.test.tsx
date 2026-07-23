import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { UnifiedPageHeader } from './UnifiedPageHeader'

describe('UnifiedPageHeader', () => {
  it('renders Sloty, club name, page title, subtitle, and mobile menu button', async () => {
    const user = userEvent.setup()
    const onMenuClick = vi.fn()

    const { container } = render(
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

    const menuButton = screen.getByRole('button', { name: 'فتح القائمة' })
    expect(menuButton).toBeInTheDocument()
    expect(container.querySelector('header')?.dir).toBe('rtl')
    expect(container.querySelector('header div')?.firstElementChild)
      .toBe(menuButton)

    await user.click(menuButton)

    expect(onMenuClick).toHaveBeenCalledTimes(1)
  })

  it('hides the menu button when the shell disables mobile menu access', () => {
    render(<UnifiedPageHeader showMenuButton={false} title="لوحة التحكم" />)

    expect(screen.queryByRole('button', { name: 'فتح القائمة' }))
      .not.toBeInTheDocument()
  })
})
