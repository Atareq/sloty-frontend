import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PageHeader } from './PageHeader'

describe('PageHeader', () => {
  it('renders Sloty, club name, page title, subtitle, and mobile menu button', async () => {
    const user = userEvent.setup()
    const onMenuClick = vi.fn()

    const { container } = render(
      <PageHeader
        clubName="Demo Football Club"
        onMenuClick={onMenuClick}
        subtitle="ملخص اليوم ومؤشرات التشغيل"
        title="لوحة التحكم"
      />,
    )

    expect(screen.getByText('Sloty')).toBeInTheDocument()
    expect(screen.getByText('النادي الحالي: Demo Football Club'))
      .toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'لوحة التحكم' }))
      .toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByText('ملخص اليوم ومؤشرات التشغيل')).toBeInTheDocument()

    const menuButton = screen.getByRole('button', { name: 'فتح القائمة' })
    expect(menuButton).toBeInTheDocument()
    expect(container.querySelector('header')?.dir).toBe('rtl')
    expect(container.querySelector('header')).toHaveClass('sloty-green-surface')
    expect(container.querySelector('header div')?.firstElementChild)
      .toBe(menuButton)

    await user.click(menuButton)

    expect(onMenuClick).toHaveBeenCalledTimes(1)
  })

  it('hides club context and menu button when the shell does not provide them', () => {
    const { container } = render(
      <PageHeader
        clubName={null}
        showMenuButton={false}
        subtitle="ضبط إعدادات المنصة"
        title="إعدادات المنصة"
      />,
    )

    expect(screen.queryByText(/النادي الحالي:/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'فتح القائمة' }))
      .not.toBeInTheDocument()
    expect(container.querySelector('header')).toHaveAttribute('dir', 'rtl')
    expect(screen.getByRole('heading', { level: 1, name: 'إعدادات المنصة' }))
      .toBeInTheDocument()
  })
})
