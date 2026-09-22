export interface GenerateScheduleQrShareCardSvgParams {
  courtName?: string
  qrSvg: string
  width?: number
  height?: number
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function wrapText(text: string, maxCharsPerLine = 22, maxLines = 2): string[] {
  const words = text.trim().split(/\s+/)
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    if (!currentLine) {
      currentLine = word
    } else if ((currentLine + ' ' + word).length <= maxCharsPerLine) {
      currentLine += ' ' + word
    } else {
      lines.push(currentLine)
      currentLine = word
    }
  }
  if (currentLine) {
    lines.push(currentLine)
  }

  const wrapped = lines.length > 0 ? lines : [text]
  if (wrapped.length <= maxLines) {
    return wrapped
  }

  const kept = wrapped.slice(0, maxLines)
  const lastLine = kept[maxLines - 1]
  kept[maxLines - 1] =
    lastLine.length >= maxCharsPerLine
      ? `${lastLine.slice(0, Math.max(0, maxCharsPerLine - 1))}…`
      : `${lastLine}…`
  return kept
}

function extractQrInnerSvg(qrSvgString: string): {
  viewBox: string
  content: string
} {
  const viewBoxMatch = qrSvgString.match(/viewBox="([^"]+)"/)
  const viewBox = viewBoxMatch ? viewBoxMatch[1] : '0 0 256 256'
  const content = qrSvgString
    .replace(/<svg[^>]*>/, '')
    .replace(/<\/svg>/, '')
  return { viewBox, content }
}

/**
 * Generates a high-resolution, branded 4:5 SVG share card (1080x1350)
 * matching the approved Sloty design language:
 * - Restrained top green accent bar
 * - Subtle football court line motifs
 * - Dynamic court title with balanced wrapping
 * - Warm accent separator
 * - Subtitle: جدول المواعيد المتاحة
 * - Dedicated white QR container with generous quiet zone
 * - Helper instruction: امسح الكود لعرض مواعيد الملعب
 * - Sloty footer branding with subtle divider lines
 *
 * All colors derived strictly from existing Sloty semantic tokens.
 */
export function generateScheduleQrShareCardSvg({
  courtName,
  qrSvg,
  width = 1080,
  height = 1350,
}: GenerateScheduleQrShareCardSvgParams): string {
  const courtDisplayName = (courtName || 'الملعب').trim()
  const nameLines = wrapText(courtDisplayName, 20)
  const isTwoLines = nameLines.length > 1
  const nameStartY = isTwoLines ? 175 : 195
  const nameLineHeight = 65
  const nameFontSize = isTwoLines ? 52 : 62

  const separatorY = nameStartY + (nameLines.length - 1) * nameLineHeight + 40
  const subtitleY = separatorY + 60

  const qr = extractQrInnerSvg(qrSvg)

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" dir="rtl">
  <defs>
    <style>
      .sloty-card-title {
        font-family: Cairo, 'IBM Plex Sans Arabic', Tajawal, 'Noto Sans Arabic', system-ui, -apple-system, sans-serif;
        font-weight: 900;
        fill: #111827;
      }
      .sloty-card-subtitle {
        font-family: Cairo, 'IBM Plex Sans Arabic', Tajawal, 'Noto Sans Arabic', system-ui, -apple-system, sans-serif;
        font-weight: 600;
        fill: #6B7280;
      }
      .sloty-card-instruction {
        font-family: Cairo, 'IBM Plex Sans Arabic', Tajawal, 'Noto Sans Arabic', system-ui, -apple-system, sans-serif;
        font-weight: 700;
        fill: #111827;
      }
      .sloty-card-brand {
        font-family: Cairo, system-ui, -apple-system, sans-serif;
        font-weight: 900;
        fill: #0B6B3A;
      }
    </style>
  </defs>

  <!-- Card Background Surface -->
  <rect x="0" y="0" width="${width}" height="${height}" rx="48" ry="48" fill="#F8FAFC" stroke="#E5E7EB" stroke-width="4"/>

  <!-- Top Brand Green Accent Bar -->
  <path d="M 0 48 Q 0 0 48 0 L ${width - 48} 0 Q ${width} 0 ${width} 48 L ${width} 64 L 0 64 Z" fill="#064E3B"/>

  <!-- Subtle Football Court Motifs (low visual weight) -->
  <!-- Top-left corner arc -->
  <path d="M 0 240 A 160 160 0 0 1 200 64" fill="none" stroke="#0B6B3A" stroke-width="6" stroke-opacity="0.14"/>
  <path d="M 0 170 A 90 90 0 0 1 110 64" fill="none" stroke="#0B6B3A" stroke-width="4" stroke-opacity="0.08"/>

  <!-- Bottom-left corner block -->
  <path d="M 0 1160 Q 0 1350 190 1350 L 0 1350 Z" fill="#0B6B3A" fill-opacity="0.08"/>

  <!-- Bottom-right field circle arc -->
  <path d="M 880 1350 A 200 200 0 0 0 1080 1150" fill="none" stroke="#0B6B3A" stroke-width="6" stroke-opacity="0.14"/>
  <path d="M 950 1350 A 130 130 0 0 0 1080 1220" fill="none" stroke="#0B6B3A" stroke-width="4" stroke-opacity="0.08"/>

  <!-- Court Name -->
  <text x="540" y="${nameStartY}" text-anchor="middle" font-size="${nameFontSize}" class="sloty-card-title">
    ${nameLines
      .map(
        (line, idx) =>
          `<tspan x="540" dy="${idx === 0 ? 0 : nameLineHeight}">${escapeXml(
            line,
          )}</tspan>`,
      )
      .join('')}
  </text>

  <!-- Yellow Accent Separator Pill -->
  <rect x="510" y="${separatorY}" width="60" height="8" rx="4" fill="#F59E0B"/>

  <!-- Subtitle: جدول المواعيد المتاحة -->
  <text x="540" y="${subtitleY}" text-anchor="middle" font-size="34" class="sloty-card-subtitle">
    جدول المواعيد المتاحة
  </text>

  <!-- Dedicated White QR Container Surface -->
  <rect x="170" y="370" width="740" height="740" rx="40" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="3"/>

  <!-- Clean QR Matrix (Nested SVG, black on white, quiet zone preserved) -->
  <svg x="220" y="420" width="640" height="640" viewBox="${qr.viewBox}">
    ${qr.content}
  </svg>

  <!-- Helper Instruction: امسح الكود لعرض مواعيد الملعب -->
  <text x="540" y="1165" text-anchor="middle" font-size="36" class="sloty-card-instruction">
    امسح الكود لعرض مواعيد الملعب
  </text>

  <!-- Sloty Footer Branding -->
  <line x1="380" y1="1246" x2="475" y2="1246" stroke="#E5E7EB" stroke-width="3" stroke-linecap="round"/>
  <text x="540" y="1255" text-anchor="middle" font-size="30" class="sloty-card-brand">
    Sloty
  </text>
  <line x1="605" y1="1246" x2="700" y2="1246" stroke="#E5E7EB" stroke-width="3" stroke-linecap="round"/>
</svg>`
}

