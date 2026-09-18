import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppSuccessNotice } from './AppSuccessNotice'

describe('AppSuccessNotice', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('auto-dismisses after three seconds and keeps the latest dismiss callback', () => {
    vi.useFakeTimers()
    const firstDismiss = vi.fn()
    const secondDismiss = vi.fn()

    const { rerender } = render(
      <AppSuccessNotice message="تم حجز الموعد بنجاح" onDismiss={firstDismiss} />,
    )

    expect(screen.getByRole('status')).toHaveTextContent('تم حجز الموعد بنجاح')

    rerender(
      <AppSuccessNotice message="تم حجز الموعد بنجاح" onDismiss={secondDismiss} />,
    )

    act(() => {
      vi.advanceTimersByTime(2999)
    })
    expect(firstDismiss).not.toHaveBeenCalled()
    expect(secondDismiss).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(firstDismiss).not.toHaveBeenCalled()
    expect(secondDismiss).toHaveBeenCalledTimes(1)
  })

  it('supports warning tone with title and a longer timeout', () => {
    vi.useFakeTimers()
    const onDismiss = vi.fn()

    render(
      <AppSuccessNotice
        message="فيه حجز متعارض في أحد الأسابيع الجاية."
        onDismiss={onDismiss}
        timeoutMs={5000}
        title="التثبيت الأسبوعي مش متاح"
        tone="warning"
      />,
    )

    const notice = screen.getByRole('status')
    expect(notice).toHaveTextContent('التثبيت الأسبوعي مش متاح')
    expect(notice).toHaveTextContent('فيه حجز متعارض في أحد الأسابيع الجاية.')
    expect(notice).toHaveClass('bg-amber-50')

    act(() => {
      vi.advanceTimersByTime(4999)
    })
    expect(onDismiss).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('maintains physical top-left position, safe-area top offset, and mobile containment', () => {
    render(
      <AppSuccessNotice
        message="تم الحفظ بنجاح"
        onDismiss={vi.fn()}
      />,
    )

    const notice = screen.getByRole('status')
    expect(notice).toHaveClass('fixed')
    expect(notice).toHaveClass('left-4')
    expect(notice).toHaveClass('top-[calc(env(safe-area-inset-top,0px)+1rem)]')
    expect(notice).toHaveClass('z-[70]')
    expect(notice).toHaveClass('max-w-[calc(100vw-2rem)]')
    expect(notice).toHaveClass('sm:max-w-sm')
  })
})
