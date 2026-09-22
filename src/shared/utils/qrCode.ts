import QRCode from 'qrcode'

export type QrErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H'

export interface QrCodeOptions {
  size?: number
  margin?: number
  darkColor?: string
  lightColor?: string
  errorCorrectionLevel?: QrErrorCorrectionLevel
}

/**
 * Generates an SVG string representation of a QR code using mature qrcode encoder.
 *
 * Scanner-friendly defaults:
 * - Black modules on white background (high contrast)
 * - Quiet zone margin >= 4 modules
 * - Error correction level 'M' (15% recovery)
 */
export function generateQrSvg(text: string, options: QrCodeOptions = {}): string {
  const {
    size = 256,
    margin = 4,
    darkColor = '#000000',
    lightColor = '#ffffff',
    errorCorrectionLevel = 'M',
  } = options

  let result = ''
  let error: Error | null = null

  QRCode.toString(
    text,
    {
      type: 'svg',
      margin,
      width: size,
      color: {
        dark: darkColor,
        light: lightColor,
      },
      errorCorrectionLevel,
    },
    (err, svg) => {
      if (err) {
        error = err
      } else {
        result = svg
      }
    },
  )

  if (error) {
    throw error
  }

  return result
}

/**
 * Converts an SVG string into a PNG File/Blob in the browser using an offscreen canvas.
 * Supports custom width and height for non-square high-resolution share cards (e.g. 1080x1350).
 * Returns null if canvas or DOM Image is unsupported.
 */
export async function qrSvgToPngBlob(
  svgString: string,
  width = 512,
  height = width,
): Promise<Blob | null> {
  if (
    typeof window === 'undefined' ||
    typeof document === 'undefined' ||
    typeof Image === 'undefined'
  ) {
    return null
  }

  // Ensure fonts are loaded before rasterizing if font-loading API is available
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    try {
      await document.fonts.ready
    } catch {
      // continue even if font loading times out or errors
    }
  }

  return new Promise((resolve) => {
    try {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(null)
        return
      }

      const img = new Image()
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(svgBlob)

      img.onload = () => {
        try {
          ctx.drawImage(img, 0, 0, width, height)
          URL.revokeObjectURL(url)
          canvas.toBlob((blob) => {
            resolve(blob)
          }, 'image/png')
        } catch {
          URL.revokeObjectURL(url)
          resolve(null)
        }
      }

      img.onerror = () => {
        URL.revokeObjectURL(url)
        resolve(null)
      }

      img.src = url
    } catch {
      resolve(null)
    }
  })
}

/**
 * Generates a high-resolution PNG blob directly from a string payload.
 */
export async function generateQrPngBlob(
  text: string,
  targetSize = 512,
): Promise<Blob | null> {
  const svg = generateQrSvg(text, { size: targetSize, margin: 4 })
  return qrSvgToPngBlob(svg, targetSize)
}

/**
 * Generates a clean sanitized filename for court schedule QR image download.
 * Pattern: sloty-{court-name}-schedule-qr.png
 */
export function getCourtScheduleQrFilename(courtName?: string): string {
  const normalized = (courtName || '')
    .trim()
    .toLowerCase()
    .replace(/[/\\:*?"<>|]/g, '')
    .replace(/\s+/g, '-')

  const base = normalized || 'court'
  return `sloty-${base}-schedule-qr.png`
}

/**
 * Triggers a browser download of a Blob file with the given filename.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
