import { describe, expect, it } from 'vitest'
import {
  HEADER_COLLAPSE_END_PX,
  HEADER_COLLAPSE_START_PX,
  getPageHeaderScrollProgress,
  getPageHeaderScrollState,
} from './usePageHeaderScroll'

describe('page header scroll progress', () => {
  it('stays expanded through the small dead zone', () => {
    expect(getPageHeaderScrollProgress(0)).toBe(0)
    expect(getPageHeaderScrollProgress(HEADER_COLLAPSE_START_PX)).toBe(0)
    expect(getPageHeaderScrollState(0)).toBe('expanded')
  })

  it('returns a mid-range progress while transitioning', () => {
    const mid =
      HEADER_COLLAPSE_START_PX +
      (HEADER_COLLAPSE_END_PX - HEADER_COLLAPSE_START_PX) / 2

    expect(getPageHeaderScrollProgress(mid)).toBeCloseTo(0.5)
    expect(getPageHeaderScrollState(0.5)).toBe('transitioning')
  })

  it('collapses at and beyond the threshold', () => {
    expect(getPageHeaderScrollProgress(HEADER_COLLAPSE_END_PX)).toBe(1)
    expect(getPageHeaderScrollProgress(HEADER_COLLAPSE_END_PX + 40)).toBe(1)
    expect(getPageHeaderScrollState(1)).toBe('collapsed')
  })
})
