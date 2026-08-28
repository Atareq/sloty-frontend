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
})
