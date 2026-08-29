import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HEADER_COLLAPSE_END_PX } from '../../hooks/usePageHeaderScroll'
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

function getHeader(container: HTMLElement): HTMLElement {
  const header = container.querySelector('header')

  if (!(header instanceof HTMLElement)) {
    throw new Error('Missing page header')
  }

  return header
}

function setWindowScrollY(scrollY: number): void {
  Object.defineProperty(window, 'scrollY', {
    configurable: true,
    value: scrollY,
  })
}

async function scrollWindow(scrollY: number): Promise<void> {
  setWindowScrollY(scrollY)
  await act(async () => {
    window.dispatchEvent(new Event('scroll'))
  })
}

describe('PageHeader', () => {
  beforeEach(() => {
    setWindowScrollY(0)
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0)
      return 1
    })
    vi.stubGlobal('cancelAnimationFrame', () => undefined)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    setWindowScrollY(0)
  })

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

    const header = getHeader(container)
    const context = header.querySelector('[data-page-header-context]')
    const controls = header.querySelector('.sloty-page-header-controls')

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
    expect(header.dir).toBe('rtl')
    expect(header).toHaveAttribute('data-header-scroll-state', 'expanded')
    expect(header).not.toHaveClass('sticky')
    expect(context).toHaveClass('sloty-green-surface')
    expect(controls).toHaveClass('sticky', 'top-0')
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
    expect(container.querySelector('[data-page-header-actions="start"]'))
      .not.toBeInTheDocument()
    expect(container.querySelector('.sloty-page-header-controls'))
      .not.toBeInTheDocument()
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

  it('fades page context on scroll while keeping Burger and Home usable', async () => {
    const user = userEvent.setup()
    const onHomeClick = vi.fn()
    const onMenuClick = vi.fn()

    const { container } = render(
      <PageHeader
        clubName="نادي النصر"
        onHomeClick={onHomeClick}
        onMenuClick={onMenuClick}
        showHomeButton
        subtitle="سجل الحجوزات"
        title="سجل الحجوزات"
      />,
    )

    const header = getHeader(container)
    const context = header.querySelector('[data-page-header-context]')
    const menuButton = screen.getByRole('button', { name: 'فتح القائمة' })
    const homeButton = screen.getByRole('button', { name: 'الرئيسية' })

    expect(header).toHaveAttribute('data-header-scroll-state', 'expanded')
    expect(screen.getByRole('heading', { level: 1, name: 'سجل الحجوزات' }))
      .toBeInTheDocument()

    await scrollWindow(40)
    expect(header).toHaveAttribute('data-header-scroll-state', 'transitioning')
    expect(screen.getByRole('heading', { level: 1, name: 'سجل الحجوزات' }))
      .toBeInTheDocument()

    await scrollWindow(HEADER_COLLAPSE_END_PX)
    expect(header).toHaveAttribute('data-header-scroll-state', 'collapsed')
    expect(context).toHaveAttribute('aria-hidden', 'true')
    expect(screen.queryByRole('heading', { level: 1, name: 'سجل الحجوزات' }))
      .not.toBeInTheDocument()
    expect(menuButton).toBeVisible()
    expect(homeButton).toBeVisible()

    await user.click(menuButton)
    await user.click(homeButton)
    expect(onMenuClick).toHaveBeenCalledTimes(1)
    expect(onHomeClick).toHaveBeenCalledTimes(1)

    await scrollWindow(0)
    expect(header).toHaveAttribute('data-header-scroll-state', 'expanded')
    expect(screen.getByRole('heading', { level: 1, name: 'سجل الحجوزات' }))
      .toBeInTheDocument()
    expect(screen.getByText('النادي الحالي: نادي النصر')).toBeInTheDocument()
  })

  it('restores expanded context when resetKey changes at the top', async () => {
    const { container, rerender } = render(
      <PageHeader resetKey="/bookings" showHomeButton title="سجل الحجوزات" />,
    )

    await scrollWindow(HEADER_COLLAPSE_END_PX)
    expect(getHeader(container)).toHaveAttribute(
      'data-header-scroll-state',
      'collapsed',
    )

    setWindowScrollY(0)
    rerender(
      <PageHeader resetKey="/schedule" showHomeButton title="الرئيسية" />,
    )

    expect(getHeader(container)).toHaveAttribute(
      'data-header-scroll-state',
      'expanded',
    )
    expect(screen.getByRole('heading', { level: 1, name: 'الرئيسية' }))
      .toBeInTheDocument()
  })
})
