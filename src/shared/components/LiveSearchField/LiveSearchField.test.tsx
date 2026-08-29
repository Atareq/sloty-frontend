import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LiveSearchField } from './LiveSearchField'

describe('LiveSearchField', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('keeps the input mounted while debouncing the server query', () => {
    const onSearch = vi.fn()

    render(
      <LiveSearchField
        label="اسم العميل أو رقم الموبايل"
        onSearch={onSearch}
        value=""
      />,
    )

    const input = screen.getByRole('searchbox', {
      name: 'اسم العميل أو رقم الموبايل',
    })
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'أحمد' } })

    expect(onSearch).not.toHaveBeenCalled()
    expect(input).toHaveValue('أحمد')

    act(() => {
      vi.advanceTimersByTime(349)
    })
    expect(onSearch).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(onSearch).toHaveBeenCalledTimes(1)
    expect(onSearch).toHaveBeenCalledWith('أحمد')
    expect(input).toBeInTheDocument()
    expect(input).toHaveValue('أحمد')
  })

  it('reports the live draft immediately without waiting for debounce', () => {
    const onSearch = vi.fn()
    const onDraftChange = vi.fn()

    render(
      <LiveSearchField
        label="اسم العميل أو رقم الموبايل"
        onDraftChange={onDraftChange}
        onSearch={onSearch}
        value=""
      />,
    )

    const input = screen.getByRole('searchbox', {
      name: 'اسم العميل أو رقم الموبايل',
    })
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'Ahmed' } })

    expect(onDraftChange).toHaveBeenCalledWith('Ahmed')
    expect(onSearch).not.toHaveBeenCalled()
    expect(input).toHaveValue('Ahmed')
  })

  it('clears a focused draft on external reset and cancels the old debounce', () => {
    const onSearch = vi.fn()
    const onDraftChange = vi.fn()
    const { rerender } = render(
      <LiveSearchField
        label="بحث قابل لإعادة الاستخدام"
        onDraftChange={onDraftChange}
        onSearch={onSearch}
        value="أحمد"
      />,
    )

    const input = screen.getByRole('searchbox', {
      name: 'بحث قابل لإعادة الاستخدام',
    })
    input.focus()
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'أحمد م' } })

    expect(input).toHaveFocus()
    expect(input).toHaveValue('أحمد م')

    rerender(
      <LiveSearchField
        label="بحث قابل لإعادة الاستخدام"
        onDraftChange={onDraftChange}
        onSearch={onSearch}
        value=""
      />,
    )

    expect(input).toHaveFocus()
    expect(input).toHaveValue('')
    expect(onDraftChange).toHaveBeenLastCalledWith('')

    act(() => {
      vi.advanceTimersByTime(700)
    })

    expect(onSearch).not.toHaveBeenCalled()
    expect(input).toHaveValue('')
  })

  it('continues debounced typing normally after an external reset', () => {
    const onSearch = vi.fn()
    const { rerender } = render(
      <LiveSearchField
        label="بحث مشترك"
        onSearch={onSearch}
        value="قديم"
      />,
    )

    const input = screen.getByRole('searchbox', { name: 'بحث مشترك' })
    input.focus()
    fireEvent.focus(input)
    rerender(
      <LiveSearchField label="بحث مشترك" onSearch={onSearch} value="" />,
    )
    fireEvent.change(input, { target: { value: 'جديد' } })

    act(() => {
      vi.advanceTimersByTime(350)
    })

    expect(onSearch).toHaveBeenCalledTimes(1)
    expect(onSearch).toHaveBeenCalledWith('جديد')
    expect(input).toHaveFocus()
    expect(input).toHaveValue('جديد')
  })
})
