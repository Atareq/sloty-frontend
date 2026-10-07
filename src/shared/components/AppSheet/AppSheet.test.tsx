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

  it('renders visible heading in sloty-green-surface and sets accessible name when title is provided', () => {
    render(
      <AppSheet onRequestClose={vi.fn()} title="تفاصيل العملية المالية">
        <p>محتوى الشيت</p>
      </AppSheet>,
    )

    const dialog = screen.getByRole('dialog', { name: 'تفاصيل العملية المالية' })
    expect(dialog).toBeInTheDocument()

    const heading = screen.getByRole('heading', { name: 'تفاصيل العملية المالية' })
    expect(heading).toBeInTheDocument()
    expect(heading).toHaveClass('text-white')
    expect(heading.parentElement).toHaveClass('sloty-green-surface')
  })

  it('sets accessible name from ariaLabel without rendering visible heading when only ariaLabel is provided', () => {
    render(
      <AppSheet ariaLabel="اختيار الملعب" onRequestClose={vi.fn()}>
        <p>محتوى الشيت</p>
      </AppSheet>,
    )

    const dialog = screen.getByRole('dialog', { name: 'اختيار الملعب' })
    expect(dialog).toBeInTheDocument()

    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
    expect(screen.queryByText('اختيار الملعب')).not.toBeInTheDocument()
  })

  it('renders visible heading once when both title and ariaLabel are provided', () => {
    render(
      <AppSheet
        ariaLabel="تسجيل الخروج"
        onRequestClose={vi.fn()}
        title="تسجيل الخروج"
      >
        <p>محتوى تأكيد الخروج</p>
      </AppSheet>,
    )

    const dialog = screen.getByRole('dialog', { name: 'تسجيل الخروج' })
    expect(dialog).toBeInTheDocument()

    const headings = screen.getAllByRole('heading', { name: 'تسجيل الخروج' })
    expect(headings).toHaveLength(1)
  })

  it('identifies missing title and missing ariaLabel as an invalid usage', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      render(
        <AppSheet onRequestClose={vi.fn()}>
          <p>محتوى بدون تسمية</p>
        </AppSheet>,
      )
    }).toThrow('AppSheet: An accessible name must be provided using either "title" or "ariaLabel".')

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('AppSheet: An accessible name must be provided'),
    )

    consoleSpy.mockRestore()
  })

  describe('footer slot', () => {
    it('keeps the existing single scrolling panel when no footer is provided', () => {
      render(
        <AppSheet onRequestClose={vi.fn()} title="بدون تذييل">
          <p>محتوى</p>
        </AppSheet>,
      )

      const dialog = screen.getByRole('dialog', { name: 'بدون تذييل' })

      expect(dialog).toHaveClass('overflow-y-auto')
      expect(dialog).not.toHaveClass('flex', 'flex-col')
      expect(screen.queryByTestId('app-sheet-body')).not.toBeInTheDocument()
      expect(screen.queryByTestId('app-sheet-footer')).not.toBeInTheDocument()
    })

    it('renders a fixed header, a scrollable body, and a footer outside the scroll area', () => {
      render(
        <AppSheet
          footer={<button type="button">إجراء ثابت</button>}
          onRequestClose={vi.fn()}
          title="مع تذييل"
        >
          <ul>
            {Array.from({ length: 30 }, (_, index) => (
              <li key={index}>عنصر {index + 1}</li>
            ))}
          </ul>
        </AppSheet>,
      )

      const dialog = screen.getByRole('dialog', { name: 'مع تذييل' })
      const heading = screen.getByRole('heading', { name: 'مع تذييل' })
      const body = screen.getByTestId('app-sheet-body')
      const footer = screen.getByTestId('app-sheet-footer')
      const footerAction = screen.getByRole('button', { name: 'إجراء ثابت' })

      expect(dialog).toHaveClass('flex', 'flex-col', 'overflow-hidden')
      expect(dialog).not.toHaveClass('overflow-y-auto')
      expect(body).toHaveClass('min-h-0', 'flex-1', 'overflow-y-auto')
      expect(footer).toHaveClass('shrink-0')
      expect(body).toHaveTextContent('عنصر 30')
      expect(body).not.toContainElement(heading)
      expect(body).not.toContainElement(footerAction)
      expect(footer).toContainElement(footerAction)
      expect(body.compareDocumentPosition(footer)).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING,
      )
    })

    it('keeps enabled footer actions in the focus trap and skips disabled ones', () => {
      render(
        <AppSheet
          footer={
            <>
              <button disabled type="button">
                معطل
              </button>
              <button type="button">آخر إجراء</button>
            </>
          }
          onRequestClose={vi.fn()}
          title="تنقل لوحة المفاتيح"
        >
          <button type="button">أول عنصر</button>
        </AppSheet>,
      )

      const closeButton = screen.getByRole('button', { name: 'إغلاق' })
      const lastAction = screen.getByRole('button', { name: 'آخر إجراء' })

      lastAction.focus()
      fireEvent.keyDown(lastAction, { key: 'Tab' })
      expect(closeButton).toHaveFocus()

      closeButton.focus()
      fireEvent.keyDown(closeButton, { key: 'Tab', shiftKey: true })
      expect(lastAction).toHaveFocus()
    })
  })
})

