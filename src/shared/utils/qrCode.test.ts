import { describe, expect, it, vi } from 'vitest'
import jsQR from 'jsqr'
import {
  downloadBlob,
  generateQrPngBlob,
  generateQrSvg,
  getCourtScheduleQrFilename,
} from './qrCode'

/**
 * Independent QR decoder test helper.
 * Rasterizes the SVG output string produced by the encoder into RGBA pixels
 * and decodes it using jsQR (a completely independent QR reader).
 */
function decodeSvgWithJsQr(svgString: string): string | null {
  const vbMatch = svgString.match(/viewBox="0 0 (\d+) (\d+)"/)
  if (!vbMatch) return null
  const totalSize = parseInt(vbMatch[1], 10)

  const pathMatch = svgString.match(/<path stroke="[^"]*" d="([^"]+)"\/>/)
  if (!pathMatch) return null
  const d = pathMatch[1]

  const scale = 4
  const width = totalSize * scale
  const height = totalSize * scale
  const rgba = new Uint8ClampedArray(width * height * 4)
  rgba.fill(255) // White background

  const tokens = d.match(/([Mmh])|([-+]?[0-9]*\.?[0-9]+)/g)
  if (!tokens) return null

  let curX = 0
  let curY = 0
  let i = 0

  while (i < tokens.length) {
    const cmd = tokens[i++]
    if (cmd === 'M') {
      curX = parseFloat(tokens[i++])
      curY = Math.floor(parseFloat(tokens[i++]))
    } else if (cmd === 'm') {
      curX += parseFloat(tokens[i++])
      curY += Math.floor(parseFloat(tokens[i++]))
    } else if (cmd === 'h') {
      const len = parseFloat(tokens[i++])
      for (let x = curX; x < curX + len; x++) {
        for (let dy = 0; dy < scale; dy++) {
          for (let dx = 0; dx < scale; dx++) {
            const px = Math.round(x * scale + dx)
            const py = Math.round(curY * scale + dy)
            const idx = (py * width + px) * 4
            rgba[idx] = 0
            rgba[idx + 1] = 0
            rgba[idx + 2] = 0
            rgba[idx + 3] = 255
          }
        }
      }
      curX += len
    }
  }

  const res = jsQR(rgba, width, height)
  return res ? res.data : null
}

describe('qrCode utility', () => {
  describe('generateQrSvg and independent jsQR decode', () => {
    it('generates valid SVG output with crispEdges and correct attributes', () => {
      const url = 'https://example.com'
      const svg = generateQrSvg(url, { size: 256, margin: 4 })

      expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"')
      expect(svg).toContain('width="256"')
      expect(svg).toContain('height="256"')
      expect(svg).toContain('shape-rendering="crispEdges"')
      expect(svg).toContain('viewBox="0 0 ')
    })

    it('decodes https://example.com accurately with independent jsQR decoder', () => {
      const targetUrl = 'https://example.com'
      const svg = generateQrSvg(targetUrl)
      const decoded = decodeSvgWithJsQr(svg)

      expect(decoded).toBe(targetUrl)
    })

    it('decodes a realistic Sloty public court schedule URL', () => {
      const slotyUrl =
        'https://sloty.baronlearning.com/public/nasr-club/courts/5/schedule'
      const svg = generateQrSvg(slotyUrl)
      const decoded = decodeSvgWithJsQr(svg)

      expect(decoded).toBe(slotyUrl)
    })

    it('decodes a URL containing percent-encoded path components byte-for-byte', () => {
      const encodedUrl =
        'https://sloty.baronlearning.com/public/%D8%A7%D9%84%D9%86%D8%A7%D8%AF%D9%8A%20%D8%A7%D9%84%D8%A3%D9%87%D9%84%D9%8A/courts/court%20%231/schedule'
      const svg = generateQrSvg(encodedUrl)
      const decoded = decodeSvgWithJsQr(svg)

      expect(decoded).toBe(encodedUrl)
    })

    it('decodes a longer realistic Sloty URL with query parameters', () => {
      const longerUrl =
        'https://sloty.baronlearning.com/public/al-mokawloon-al-arab-sporting-club/courts/105/schedule?date=2026-10-15&view=compact&utm_source=share_qr'
      const svg = generateQrSvg(longerUrl)
      const decoded = decodeSvgWithJsQr(svg)

      expect(decoded).toBe(longerUrl)
    })
  })

  describe('getCourtScheduleQrFilename', () => {
    it('generates sanitized filename with Arabic court name', () => {
      expect(getCourtScheduleQrFilename('الملعب الرئيسي')).toBe(
        'sloty-الملعب-الرئيسي-schedule-qr.png',
      )
    })

    it('generates sanitized filename with English court name and special characters', () => {
      expect(getCourtScheduleQrFilename('Court / 1: VIP')).toBe(
        'sloty-court-1-vip-schedule-qr.png',
      )
    })

    it('uses fallback "court" when court name is empty or undefined', () => {
      expect(getCourtScheduleQrFilename()).toBe('sloty-court-schedule-qr.png')
      expect(getCourtScheduleQrFilename('')).toBe('sloty-court-schedule-qr.png')
    })
  })

  describe('downloadBlob', () => {
    it('creates an anchor, clicks it, and revokes object URL', () => {
      const mockCreateObjectURL = vi.fn().mockReturnValue('blob:http://localhost/test')
      const mockRevokeObjectURL = vi.fn()
      window.URL.createObjectURL = mockCreateObjectURL
      window.URL.revokeObjectURL = mockRevokeObjectURL

      const clickSpy = vi.fn()
      const originalCreateElement = document.createElement.bind(document)
      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        const el = originalCreateElement(tagName)
        if (tagName === 'a') {
          el.click = clickSpy
        }
        return el
      })

      const blob = new Blob(['test content'], { type: 'image/png' })
      downloadBlob(blob, 'test-file.png')

      expect(mockCreateObjectURL).toHaveBeenCalledWith(blob)
      expect(clickSpy).toHaveBeenCalled()
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/test')
    })
  })

  describe('generateQrPngBlob', () => {
    it('returns null if canvas or DOM Image is unsupported in test environment without mocking', async () => {
      const blob = await generateQrPngBlob('https://example.com')
      expect(blob).toBeNull()
    })
  })
})
