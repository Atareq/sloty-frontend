import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ShareCourtScheduleButton } from './ShareCourtScheduleButton'
import { downloadBlob, generateQrSvg } from '../../../shared/utils/qrCode'
import { buildCourtScheduleShareUrl } from '../publicSchedule.helpers'

vi.mock('../../../shared/utils/qrCode', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../shared/utils/qrCode')>()
  return {
    ...actual,
    generateQrSvg: vi.fn(actual.generateQrSvg),
    qrSvgToPngBlob: vi.fn().mockResolvedValue(new Blob(['mock-png'], { type: 'image/png' })),
    downloadBlob: vi.fn(),
  }
})

describe('ShareCourtScheduleButton', () => {
  const originalNavigator = { ...window.navigator }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    Object.defineProperty(window, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    })
  })

  it('renders single header entry point with locked copy and share icon', () => {
    render(<ShareCourtScheduleButton clubSlug="al-ahly" courtId={5} />)

    const button = screen.getByRole('button', { name: 'مشاركة الجدول' })
    expect(button).toBeInTheDocument()
    expect(button).toHaveTextContent('مشاركة الجدول')
  })

  it('opens share sheet with two options: مشاركة الرابط and QR للجدول', async () => {
    const user = userEvent.setup()
    render(<ShareCourtScheduleButton clubSlug="al-ahly" courtId={5} />)

    await user.click(screen.getByRole('button', { name: 'مشاركة الجدول' }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'مشاركة الجدول' })).toBeInTheDocument()
    expect(screen.getByText('شارك مواعيد الملعب مع اللاعبين بسهولة.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /مشاركة الرابط/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /QR للجدول/ })).toBeInTheDocument()
  })

  it('enforces exact canonical URL string equality across Copy Link, Native Share, and QR encoder', async () => {
    const user = userEvent.setup()
    const expectedShareUrl = buildCourtScheduleShareUrl({
      clubSlug: 'al-ahly',
      courtId: 5,
    })

    const mockShare = vi.fn().mockResolvedValue(undefined)
    const mockWriteText = vi.fn().mockResolvedValue(undefined)

    Object.defineProperty(window, 'navigator', {
      value: {
        ...originalNavigator,
        share: mockShare,
        clipboard: { writeText: mockWriteText },
      },
      writable: true,
      configurable: true,
    })

    const { unmount } = render(
      <ShareCourtScheduleButton
        clubSlug="al-ahly"
        courtId={5}
        courtName="الملعب الرئيسي"
      />,
    )

    // 1. Native share URL check
    await user.click(screen.getByRole('button', { name: 'مشاركة الجدول' }))
    await user.click(screen.getByRole('button', { name: /مشاركة الرابط/ }))

    expect(mockShare).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expectedShareUrl,
      }),
    )

    unmount()

    // 2. Clipboard copy fallback URL check
    Object.defineProperty(window, 'navigator', {
      value: {
        ...originalNavigator,
        share: undefined,
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
    await user.click(screen.getByRole('button', { name: /مشاركة الرابط/ }))

    expect(mockWriteText).toHaveBeenCalledWith(expectedShareUrl)

    // 3. QR SVG encoding payload check (re-open sheet after copy closes it)
    await user.click(
      screen.getByRole('button', { name: /تم النسخ|مشاركة الجدول/ }),
    )
    await user.click(screen.getByRole('button', { name: /QR للجدول/ }))

    expect(generateQrSvg).toHaveBeenCalledWith(
      expectedShareUrl,
      expect.any(Object),
    )
  })

  it('uses native share when selecting مشاركة الرابط and does not copy to clipboard', async () => {
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
    await user.click(screen.getByRole('button', { name: /مشاركة الرابط/ }))

    expect(mockShare).toHaveBeenCalledTimes(1)
    expect(mockShare).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'مواعيد الملعب الرئيسي',
        text: 'شوف المواعيد المتاحة من هنا:',
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
    await user.click(screen.getByRole('button', { name: /مشاركة الرابط/ }))

    expect(mockShare).toHaveBeenCalledTimes(1)
    expect(mockWriteText).not.toHaveBeenCalled()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByText('✓ تم النسخ')).not.toBeInTheDocument()
  })

  it('copies public URL to clipboard and shows feedback when native share is unavailable', async () => {
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

    const headerButton = screen.getByRole('button', { name: 'مشاركة الجدول' })

    await act(async () => {
      headerButton.click()
    })

    const shareLinkOption = screen.getByRole('button', { name: /مشاركة الرابط/ })
    await act(async () => {
      shareLinkOption.click()
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

    // After 1500ms, copied button state resets
    act(() => {
      vi.advanceTimersByTime(1500)
    })
    expect(screen.getByRole('button', { name: 'مشاركة الجدول' })).toBeInTheDocument()
  })

  it('transitions to QR view, displays QR image, and supports back navigation', async () => {
    const user = userEvent.setup()
    render(
      <ShareCourtScheduleButton
        clubSlug="al-ahly"
        courtId={5}
        courtName="الملعب الرئيسي"
      />,
    )

    await user.click(screen.getByRole('button', { name: 'مشاركة الجدول' }))
    expect(screen.getByRole('dialog')).toHaveClass('md:max-w-sm')

    await user.click(screen.getByRole('button', { name: /QR للجدول/ }))

    // QR view is displayed with expanded desktop width
    expect(screen.getByRole('dialog')).toHaveClass('md:max-w-md')
    expect(screen.getByRole('heading', { name: 'QR للجدول' })).toBeInTheDocument()
    expect(screen.getByText('امسح الكود لعرض مواعيد الملعب')).toBeInTheDocument()
    expect(screen.getByText('جدول المواعيد المتاحة')).toBeInTheDocument()
    expect(screen.getByText('Sloty')).toBeInTheDocument()

    const qrImage = screen.getByRole('img', {
      name: 'QR لعرض جدول مواعيد الملعب الرئيسي',
    })
    expect(qrImage).toBeInTheDocument()
    expect(qrImage).toHaveAttribute(
      'src',
      expect.stringContaining('data:image/svg+xml'),
    )

    // Primary and secondary actions: image workflow only (no link copy in QR view!)
    expect(screen.getByRole('button', { name: 'مشاركة صورة QR' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'تحميل صورة QR' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'نسخ الرابط' })).not.toBeInTheDocument()

    // Back button returns to choices view with compact width
    const backButton = screen.getByRole('button', { name: 'الرجوع' })
    await user.click(backButton)

    expect(screen.getByRole('dialog')).toHaveClass('md:max-w-sm')
    expect(screen.getByRole('heading', { name: 'مشاركة الجدول' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /مشاركة الرابط/ })).toBeInTheDocument()
  })

  it('shares QR image file via native share when file sharing is available', async () => {
    const user = userEvent.setup()
    const mockShare = vi.fn().mockResolvedValue(undefined)
    const mockCanShare = vi.fn().mockReturnValue(true)

    Object.defineProperty(window, 'navigator', {
      value: {
        ...originalNavigator,
        canShare: mockCanShare,
        share: mockShare,
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
    await user.click(screen.getByRole('button', { name: /QR للجدول/ }))

    await user.click(screen.getByRole('button', { name: 'مشاركة صورة QR' }))

    await waitFor(() => {
      expect(mockShare).toHaveBeenCalledTimes(1)
    })
    expect(mockShare).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'مواعيد الملعب الرئيسي',
        files: [expect.any(File)],
      }),
    )
  })

  it('shows warning notice and keeps download option available when file sharing is unavailable', async () => {
    const user = userEvent.setup()
    const mockShare = vi.fn().mockResolvedValue(undefined)
    const mockCanShare = vi.fn().mockReturnValue(false)

    Object.defineProperty(window, 'navigator', {
      value: {
        ...originalNavigator,
        canShare: mockCanShare,
        share: mockShare,
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
    await user.click(screen.getByRole('button', { name: /QR للجدول/ }))

    await user.click(screen.getByRole('button', { name: 'مشاركة صورة QR' }))

    // Must NOT call share with URL or text fallback
    expect(mockShare).not.toHaveBeenCalled()

    // Informational warning notice is displayed
    const notice = await screen.findByRole('status')
    expect(notice).toHaveTextContent(
      'مشاركة الصورة مش متاحة على الجهاز ده. تقدر تحمّل صورة QR بدلًا من كده.',
    )

    // Sheet stays open with download button available
    expect(screen.getByRole('button', { name: 'تحميل صورة QR' })).toBeInTheDocument()
  })

  it('downloads QR PNG file and shows download success notice when clicking تحميل صورة QR', async () => {
    const user = userEvent.setup()

    render(
      <ShareCourtScheduleButton
        clubSlug="al-ahly"
        courtId={5}
        courtName="الملعب الرئيسي"
      />,
    )

    await user.click(screen.getByRole('button', { name: 'مشاركة الجدول' }))
    await user.click(screen.getByRole('button', { name: /QR للجدول/ }))

    await user.click(screen.getByRole('button', { name: 'تحميل صورة QR' }))

    await waitFor(() => {
      expect(downloadBlob).toHaveBeenCalledWith(
        expect.any(Blob),
        'sloty-الملعب-الرئيسي-schedule-qr.png',
      )
    })

    // Success notice is displayed
    const notice = await screen.findByRole('status')
    expect(notice).toHaveTextContent('تم تحميل صورة QR')
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

    const headerButton = screen.getByRole('button', { name: 'مشاركة الجدول' })

    await act(async () => {
      headerButton.click()
    })

    const shareLinkOption = screen.getByRole('button', { name: /مشاركة الرابط/ })
    await act(async () => {
      shareLinkOption.click()
    })

    expect(mockWriteText).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('✓ تم النسخ')).not.toBeInTheDocument()
    expect(screen.queryByText(/الرابط جاهز للمشاركة مع اللاعبين/)).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('تعذر نسخ الرابط إلى الحافظة.')
  })
})
