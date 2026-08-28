import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PageHeader } from './PageHeader'

function getHeaderActionGroup(
  container: HTMLElement,
  edge: 'start' | 'end',
): HTMLElement {
  const group = container.querySelector(
    `[data-page-header-actions="${edge}"]`,
  )

  if (!(group instanceof HTMLElement)) {
    throw new Error(`Missing page header ${edge} action group`)
  }

  return group
}

describe('PageHeader', () => {
  it('renders Sloty, club name, page title, subtitle, and mobile menu button', async () => {
    const user = userEvent.setup()
    const onMenuClick = vi.fn()

    const { container } = render(
      <PageHeader
        clubName="Demo Football Club"
        onMenuClick={onMenuClick}
        subtitle="ملخص اليوم ومؤشرات التشغيل"
        title="الرئيسية"
      />,
    )

    expect(screen.getByText('Sloty')).toBeInTheDocument()
    expect(screen.getByText('النادي الحالي: Demo Football Club'))
      .toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'الرئيسية' }))
      .toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByText('ملخص اليوم ومؤشرات التشغيل')).toBeInTheDocument()

    const menuButton = screen.getByRole('button', { name: 'فتح القائمة' })
    const startActions = getHeaderActionGroup(container, 'start')
    const headerRow = startActions.parentElement

    expect(menuButton).toBeInTheDocument()
    expect(container.querySelector('header')?.dir).toBe('rtl')
    expect(container.querySelector('header')).toHaveClass('sticky', 'top-0')
    expect(startActions).toContainElement(menuButton)
    expect(headerRow?.firstElementChild).toBe(startActions)
    expect(headerRow).toHaveClass(
      'grid-cols-[auto_minmax(0,1fr)_auto]',
    )

    await user.click(menuButton)

    expect(onMenuClick).toHaveBeenCalledTimes(1)
  })

  it('keeps the burger on the RTL start edge and Home on the opposite edge', async () => {
    const user = userEvent.setup()
    const onHomeClick = vi.fn()
    const onMenuClick = vi.fn()

    const { container } = render(
      <PageHeader
        onHomeClick={onHomeClick}
        onMenuClick={onMenuClick}
        showHomeButton
        title="الجدول"
      />,
    )

    const startActions = getHeaderActionGroup(container, 'start')
    const endActions = getHeaderActionGroup(container, 'end')
    const headerRow = startActions.parentElement
    const menuButton = screen.getByRole('button', { name: 'فتح القائمة' })
    const homeButton = screen.getByRole('button', { name: 'الرئيسية' })

    expect(headerRow?.firstElementChild).toBe(startActions)
    expect(headerRow?.lastElementChild).toBe(endActions)
    expect(startActions).toContainElement(menuButton)
    expect(endActions).toContainElement(homeButton)
    expect(startActions).not.toContainElement(homeButton)
    expect(endActions).not.toContainElement(menuButton)
    expect(within(startActions).queryByRole('button', { name: 'الرئيسية' }))
      .not.toBeInTheDocument()
    expect(homeButton).toHaveTextContent('الرئيسية')

    await user.click(homeButton)
    expect(onHomeClick).toHaveBeenCalledTimes(1)
  })

  it('wraps long page identity in the middle column without sharing action groups', () => {
    const { container } = render(
      <PageHeader
        clubName="نادي كرة قدم تجريبي باسم طويل جدا لاختبار العنوان"
        showHomeButton
        subtitle="متابعة التغييرات المهمة داخل النادي مع وصف أطول من سطر واحد"
        title="المستخدمون والصلاحيات في النادي الحالي"
      />,
    )

    const heading = screen.getByRole('heading', {
      level: 1,
      name: 'المستخدمون والصلاحيات في النادي الحالي',
    })

    expect(heading).toHaveClass('break-words')
    expect(heading.parentElement?.parentElement).toHaveClass('min-w-0')
    expect(container.querySelector('header')).toHaveClass('overflow-x-hidden')
    expect(getHeaderActionGroup(container, 'start')).not.toContainElement(
      heading,
    )
    expect(getHeaderActionGroup(container, 'end')).toContainElement(
      screen.getByRole('button', { name: 'الرئيسية' }),
    )
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
    expect(screen.queryByRole('button', { name: 'الرئيسية' }))
      .not.toBeInTheDocument()
    expect(container.querySelector('header')).toHaveAttribute('dir', 'rtl')
    expect(screen.getByRole('heading', { level: 1, name: 'إعدادات المنصة' }))
      .toBeInTheDocument()
    expect(getHeaderActionGroup(container, 'start').childElementCount).toBe(0)
    expect(getHeaderActionGroup(container, 'end').childElementCount).toBe(0)
  })

  it('renders an accessible Home affordance when the shell requests it', async () => {
    const user = userEvent.setup()
    const onHomeClick = vi.fn()

    const { container } = render(
      <PageHeader
        onHomeClick={onHomeClick}
        showHomeButton
        showMenuButton={false}
        title="الجدول"
      />,
    )

    expect(screen.getByRole('button', { name: 'الرئيسية' })).toHaveTextContent(
      'الرئيسية',
    )
    expect(getHeaderActionGroup(container, 'end')).toContainElement(
      screen.getByRole('button', { name: 'الرئيسية' }),
    )
    await user.click(screen.getByRole('button', { name: 'الرئيسية' }))
    expect(onHomeClick).toHaveBeenCalledTimes(1)
  })
})
