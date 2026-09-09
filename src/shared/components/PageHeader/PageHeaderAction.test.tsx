import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PageHeaderAction } from './PageHeaderAction'
import { PageHeaderActionContext } from './pageHeaderActionContext'

describe('PageHeaderAction', () => {
  it('supplies children to setter on mount and clears on unmount', () => {
    const mockSetter = vi.fn()

    const { unmount } = render(
      <PageHeaderActionContext.Provider value={mockSetter}>
        <PageHeaderAction>
          <button type="button">مشاركة الجدول</button>
        </PageHeaderAction>
      </PageHeaderActionContext.Provider>,
    )

    expect(mockSetter).toHaveBeenCalledTimes(1)
    expect(mockSetter).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'button',
      }),
    )

    unmount()

    expect(mockSetter).toHaveBeenLastCalledWith(null)
  })

  it('updates setter when children change', () => {
    const mockSetter = vi.fn()

    const { rerender } = render(
      <PageHeaderActionContext.Provider value={mockSetter}>
        <PageHeaderAction>
          <span>الملعب 1</span>
        </PageHeaderAction>
      </PageHeaderActionContext.Provider>,
    )

    expect(mockSetter).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: 'span',
      }),
    )

    rerender(
      <PageHeaderActionContext.Provider value={mockSetter}>
        <PageHeaderAction>
          <span>الملعب 2</span>
        </PageHeaderAction>
      </PageHeaderActionContext.Provider>,
    )

    expect(mockSetter).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: 'span',
      }),
    )
  })

  it('renders safely when no provider is present', () => {
    expect(() => {
      render(
        <PageHeaderAction>
          <button type="button">زر تجريبي</button>
        </PageHeaderAction>,
      )
    }).not.toThrow()

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
