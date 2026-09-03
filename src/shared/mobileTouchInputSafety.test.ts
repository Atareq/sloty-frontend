import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(join(process.cwd(), 'src/index.css'), 'utf8')
const indexHtml = readFileSync(join(process.cwd(), 'index.html'), 'utf8')

describe('mobile touch input safety', () => {
  it('keeps touch-capable editable controls at a 16px minimum without blocking zoom', () => {
    expect(css).toContain('@media (any-pointer: coarse)')
    expect(css).toMatch(/input,\s*\n\s*textarea,\s*\n\s*select,/)
    expect(css).toContain('.sloty-phone-input__number')
    expect(css).toContain('font-size: 1rem !important')
    expect(css).not.toMatch(/user-scalable\s*=\s*no/i)
    expect(css).not.toMatch(/maximum-scale\s*=\s*1(?:\.0)?/i)
    expect(indexHtml).toContain(
      '<meta name="viewport" content="width=device-width, initial-scale=1.0" />',
    )
    expect(indexHtml).not.toMatch(/user-scalable\s*=\s*no/i)
    expect(indexHtml).not.toMatch(/maximum-scale\s*=\s*1(?:\.0)?/i)
    expect(indexHtml).not.toMatch(/minimum-scale\s*=\s*1(?:\.0)?/i)
  })

  it('uses scoped tap manipulation only on button-like controls', () => {
    expect(css).toContain("button,\n[role='button'],\nsummary,")
    expect(css).toContain('touch-action: manipulation')
    expect(css).not.toContain('* {\n  touch-action: manipulation;')
  })

  it('styles the phone placeholder separately from entered text', () => {
    expect(css).toContain('.sloty-phone-input__number::placeholder')
    expect(css).toContain('color: var(--sloty-text-muted)')
    expect(css).toContain('opacity: 0.75')
  })
})
