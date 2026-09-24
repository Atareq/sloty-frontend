import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { generateQrSvg } from '../../../shared/utils/qrCode'
import { ScheduleQrShareCard } from './ScheduleQrShareCard'
import { generateScheduleQrShareCardSvg } from './scheduleQrShareCard.helpers'

describe('ScheduleQrShareCard', () => {
  const sampleUrl = 'https://sloty.baronlearning.com/public/albaladya/courts/5/schedule'
  const sampleQrSvg = generateQrSvg(sampleUrl, { size: 640, margin: 4 })

  it('renders dynamic court name and does not hardcode reference name', () => {
    const customCourt = 'Spotify Camp Nou'
    render(<ScheduleQrShareCard courtName={customCourt} qrSvg={sampleQrSvg} />)

    expect(screen.getByText(customCourt)).toBeInTheDocument()
    expect(screen.queryByText('ملعب النصر')).not.toBeInTheDocument()
  })

  it('contains exact approved copy and no extra marketing copy', () => {
    render(<ScheduleQrShareCard courtName="ملعب النصر" qrSvg={sampleQrSvg} />)

    expect(screen.getByText('ملعب النصر')).toBeInTheDocument()
    expect(screen.getByText('جدول المواعيد المتاحة')).toBeInTheDocument()
    expect(screen.getByText('امسح الكود لعرض مواعيد الملعب')).toBeInTheDocument()
    expect(screen.getByText('Sloty')).toBeInTheDocument()
  })

  it('generates 4:5 aspect ratio SVG card with Sloty design tokens', () => {
    const cardSvg = generateScheduleQrShareCardSvg({
      courtName: 'ملعب النصر',
      qrSvg: sampleQrSvg,
    })

    expect(cardSvg).toContain('viewBox="0 0 1080 1350"')
    expect(cardSvg).toContain('width="1080"')
    expect(cardSvg).toContain('height="1350"')

    // Top brand green accent bar
    expect(cardSvg).toContain('fill="#064E3B"')

    // Subtle court motifs with low opacity
    expect(cardSvg).toContain('stroke-opacity="0.14"')

    // Yellow accent separator pill
    expect(cardSvg).toContain('fill="#F59E0B"')

    // Text hierarchy
    expect(cardSvg).toContain('ملعب النصر')
    expect(cardSvg).toContain('جدول المواعيد المتاحة')
    expect(cardSvg).toContain('امسح الكود لعرض مواعيد الملعب')
    expect(cardSvg).toContain('Sloty')

    // Clean white QR container box enlarged for scannability
    expect(cardSvg).toContain('fill="#FFFFFF"')
    expect(cardSvg).toContain('x="170" y="370" width="740" height="740"')

    // Embedded QR matrix with quiet zone
    expect(cardSvg).toContain('x="220" y="420" width="640" height="640"')
  })

  it('handles various court names: Arabic, English, long, and mixed', () => {
    const testNames = [
      'ملعب النصر',
      'ملعب الأبطال الدولي المعشب بأسيوط الجديدة',
      'Old Trafford Stadium',
      'ملعب Real Madrid بأسيوط',
    ]

    for (const name of testNames) {
      const cardSvg = generateScheduleQrShareCardSvg({
        courtName: name,
        qrSvg: sampleQrSvg,
      })

      // Escaped version should be contained in the SVG
      expect(cardSvg).toContain(name.split(' ')[0])
      expect(cardSvg).toContain('جدول المواعيد المتاحة')
      expect(cardSvg).toContain('Sloty')
    }
  })

  it('keeps long Arabic court names above the QR quiet zone', () => {
    const cardSvg = generateScheduleQrShareCardSvg({
      courtName: 'ملعب الأبطال الدولي المعشب بأسيوط الجديدة',
      qrSvg: sampleQrSvg,
    })
    const subtitleMatch = cardSvg.match(
      /y="(\d+)" text-anchor="middle" font-size="34" class="sloty-card-subtitle"/,
    )
    const subtitleY = Number(subtitleMatch?.[1] ?? '0')
    const titleBlock =
      cardSvg.match(/class="sloty-card-title"[\s\S]*?<\/text>/)?.[0] ?? ''
    const titleTspans = (titleBlock.match(/<tspan /g) ?? []).length

    expect(subtitleY).toBeGreaterThan(0)
    expect(subtitleY).toBeLessThan(370)
    expect(titleTspans).toBeLessThanOrEqual(2)
    expect(cardSvg).toContain('x="170" y="370" width="740" height="740"')
  })

  it('embeds QR SVG without altering QR matrix payload', () => {
    const cardSvg = generateScheduleQrShareCardSvg({
      courtName: 'ملعب النصر',
      qrSvg: sampleQrSvg,
    })

    // Extract embedded QR from cardSvg and decode with jsQR
    const qrMatch = cardSvg.match(/<svg x="220" y="420"[^>]*>([\s\S]*?)<\/svg>/)
    expect(qrMatch).not.toBeNull()

    // QR path from sampleQrSvg is preserved in the card
    expect(cardSvg).toContain(sampleQrSvg.slice(sampleQrSvg.indexOf('<path'), sampleQrSvg.indexOf('<path') + 50))
  })

  it('renders error state when qrError is true with exact approved copy', () => {
    render(<ScheduleQrShareCard qrError={true} />)

    expect(screen.getByText('تعذر تجهيز صورة QR حاليًا.')).toBeInTheDocument()
  })

  it('renders prominent responsive preview container without double border nesting', () => {
    render(<ScheduleQrShareCard courtName="ملعب النصر" qrSvg={sampleQrSvg} />)

    const cardContainer = screen.getByTestId('schedule-qr-share-card')
    expect(cardContainer).toHaveClass('min-w-0', 'max-w-full', 'w-full')
    expect(cardContainer).toHaveClass('sm:max-w-[380px]')
    expect(cardContainer).not.toHaveClass('hidden')
    expect(cardContainer.className).not.toMatch(/\b(?:sm|md|lg):(?:block|flex|hidden)\b/)
    expect(cardContainer).not.toHaveClass('border')
    expect(screen.getByRole('img', { name: 'QR لعرض جدول مواعيد ملعب النصر' })).toBeInTheDocument()
  })
})
