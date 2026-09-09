import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ShareCourtScheduleButton } from './ShareCourtScheduleButton'

describe('ShareCourtScheduleButton', () => {
  const originalNavigator = { ...window.navigator }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  afterEach(() => {
    Object.defineProperty(window, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    })
  })

  it('renders with locked copy and share icon', () => {
    render(<ShareCourtScheduleButton clubSlug="al-ahly" courtId={5} />)

    const button = screen.getByRole('button', { name: 'مشاركة الجدول' })
    expect(button).toBeInTheDocument()
    expect(button).toHaveTextContent('مشاركة الجدول')
  })

  it('uses native share when available and does not copy to clipboard or show copied state', async () => {
    const user = userEvent.setup()
    const mockShare = vi.fn().mockResolvedValue(undefined)
    const mockWriteText = vi.fn()

    Object.defineProperty(window, 'navigator', {
      value: {
        ...originalNavigator,
        share: mockShare,
        clipboard: { writeText: mockWriteText },
      },
      writable: true,
      configurable: true,
    })

    render(
      <ShareCourtScheduleButton
        clubSlug="al-ahly"
        courtId={5}
        courtName="الملعب الرئيسي"
      />,
    )

    await user.click(screen.getByRole('button', { name: 'مشاركة الجدول' }))

    expect(mockShare).toHaveBeenCalledTimes(1)
    expect(mockShare).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'جدول الملعب الرئيسي',
        url: expect.stringContaining('/public/al-ahly/courts/5/schedule'),
      }),
    )
    expect(mockWriteText).not.toHaveBeenCalled()
    expect(screen.queryByText('✓ تم النسخ')).not.toBeInTheDocument()
    expect(screen.queryByText(/تم نسخ رابط الجدول/)).not.toBeInTheDocument()
  })

  it('silently ignores AbortError when user cancels native share', async () => {
    const user = userEvent.setup()
    const abortError = new Error('User cancelled')
    abortError.name = 'AbortError'
    const mockShare = vi.fn().mockRejectedValue(abortError)
    const mockWriteText = vi.fn()

    Object.defineProperty(window, 'navigator', {
      value: {
        ...originalNavigator,
        share: mockShare,
        clipboard: { writeText: mockWriteText },
      },
      writable: true,
      configurable: true,
    })

    render(<ShareCourtScheduleButton clubSlug="al-ahly" courtId={5} />)

    await user.click(screen.getByRole('button', { name: 'مشاركة الجدول' }))

    expect(mockShare).toHaveBeenCalledTimes(1)
    expect(mockWriteText).not.toHaveBeenCalled()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByText('✓ تم النسخ')).not.toBeInTheDocument()
  })

  it('copies public URL to clipboard and shows locked feedback when native share is unavailable', async () => {
    vi.useFakeTimers()
    const mockWriteText = vi.fn().mockResolvedValue(undefined)

    Object.defineProperty(window, 'navigator', {
      value: {
        ...originalNavigator,
        share: undefined,
        clipboard: { writeText: mockWriteText },
      },
      writable: true,
      configurable: true,
    })

    render(<ShareCourtScheduleButton clubSlug="al-ahly" courtId={5} />)

    const button = screen.getByRole('button', { name: 'مشاركة الجدول' })

    await act(async () => {
      button.click()
    })

    expect(mockWriteText).toHaveBeenCalledTimes(1)
    expect(mockWriteText).toHaveBeenCalledWith(
      expect.stringContaining('/public/al-ahly/courts/5/schedule'),
    )

    // Button shows copied state
    expect(screen.getByRole('button', { name: 'تم النسخ' })).toBeInTheDocument()
    expect(screen.getByText('✓ تم النسخ')).toBeInTheDocument()

    // Confirmation notice is displayed with exact copy
    const notice = screen.getByRole('status')
    expect(notice).toHaveTextContent('تم نسخ رابط الجدول')
    expect(notice).toHaveTextContent('الرابط جاهز للمشاركة مع اللاعبين.')

    // After 2000ms, copied button state resets
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(screen.getByRole('button', { name: 'مشاركة الجدول' })).toBeInTheDocument()
  })

  it('shows lightweight error without fake success when clipboard copy fails', async () => {
    const mockWriteText = vi.fn().mockRejectedValue(new Error('Clipboard denied'))

    Object.defineProperty(window, 'navigator', {
      value: {
        ...originalNavigator,
        share: undefined,
        clipboard: { writeText: mockWriteText },
      },
      writable: true,
      configurable: true,
    })

    render(<ShareCourtScheduleButton clubSlug="al-ahly" courtId={5} />)

    const button = screen.getByRole('button', { name: 'مشاركة الجدول' })

    await act(async () => {
      button.click()
    })

    expect(mockWriteText).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('✓ تم النسخ')).not.toBeInTheDocument()
    expect(screen.queryByText(/الرابط جاهز للمشاركة مع اللاعبين/)).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('تعذر نسخ الرابط إلى الحافظة.')
  })
})
