import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppSheet } from './AppSheet'

afterEach(async () => {
  await new Promise((resolve) => window.setTimeout(resolve, 0))
})

describe('AppSheet', () => {
  it('renders accessible, scrollable content and closes from X and backdrop', () => {
    const onRequestClose = vi.fn()
    render(
      <AppSheet ariaLabel="تفاصيل مؤقتة" onRequestClose={onRequestClose}>
        <button type="button">إجراء داخلي</button>
      </AppSheet>,
    )

    const dialog = screen.getByRole('dialog', { name: 'تفاصيل مؤقتة' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveClass('max-h-[85dvh]', 'overflow-y-auto')
    expect(screen.getByRole('button', { name: 'إغلاق' })).not.toHaveClass(
      'text-[var(--sloty-danger)]',
    )

    fireEvent.mouseDown(screen.getByRole('button', { name: 'إجراء داخلي' }))
    expect(onRequestClose).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'إغلاق' }))
    fireEvent.mouseDown(screen.getByTestId('app-sheet-backdrop'))
    expect(onRequestClose).toHaveBeenCalledTimes(2)
  })

  it('lets only the top stacked sheet handle Escape', () => {
    const closeBottom = vi.fn()
    const closeTop = vi.fn()
    render(
      <>
        <AppSheet ariaLabel="السفلية" onRequestClose={closeBottom}>
          سفلية
        </AppSheet>
        <AppSheet ariaLabel="العلوية" onRequestClose={closeTop}>
          علوية
        </AppSheet>
      </>,
    )

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(closeTop).toHaveBeenCalledOnce()
    expect(closeBottom).not.toHaveBeenCalled()
  })

  it('closes from browser Back and restores focus to the opener', async () => {
    function Harness() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <button onClick={() => setOpen(true)} type="button">
            افتح
          </button>
          <AppSheet
            ariaLabel="اختبار الرجوع"
            isOpen={open}
            onRequestClose={() => setOpen(false)}
          >
            محتوى
          </AppSheet>
        </>
      )
    }

    render(<Harness />)
    const opener = screen.getByRole('button', { name: 'افتح' })
    opener.focus()
    fireEvent.click(opener)
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())

    window.history.back()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(opener).toHaveFocus()
  })

  it('closes stacked sheets from the top on successive Back actions', async () => {
    function StackedHarness() {
      const [bottomOpen, setBottomOpen] = useState(true)
      const [topOpen, setTopOpen] = useState(true)

      return (
        <>
          <AppSheet
            ariaLabel="السفلية"
            isOpen={bottomOpen}
            onRequestClose={() => setBottomOpen(false)}
          >
            سفلية
          </AppSheet>
          <AppSheet
            ariaLabel="العلوية"
            isOpen={topOpen}
            onRequestClose={() => setTopOpen(false)}
          >
            علوية
          </AppSheet>
        </>
      )
    }

    render(<StackedHarness />)
    window.history.back()
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'العلوية' }))
        .not.toBeInTheDocument(),
    )
    expect(screen.getByRole('dialog', { name: 'السفلية' }))
      .toBeInTheDocument()

    window.history.back()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})
