import { describe, expect, it } from 'vitest'
import {
  COURT_PRICING_UNCONFIGURED_LABEL,
  formatCourtPricingSummary,
} from './courtPricing.helpers'

describe('courtPricing.helpers', () => {
  it('renders informational price range when min and max differ (Rule 19)', () => {
    const result = formatCourtPricingSummary({
      pricing_configured: true,
      minimum_slot_price: '200',
      maximum_slot_price: '300',
    })

    expect(result).toBe('200 - 300 جنيه')
  })

  it('renders single price when min equals max without duplicate range (Rule 20)', () => {
    const result = formatCourtPricingSummary({
      pricing_configured: true,
      minimum_slot_price: '200',
      maximum_slot_price: '200',
    })

    expect(result).toBe('200 جنيه')
    expect(result).not.toContain('200 - 200')
  })

  it('renders unconfigured state without fake zero when pricing_configured is false (Rule 21)', () => {
    const result = formatCourtPricingSummary({
      pricing_configured: false,
      minimum_slot_price: null,
      maximum_slot_price: null,
    })

    expect(result).toBe(COURT_PRICING_UNCONFIGURED_LABEL)
    expect(result).not.toContain('0')
  })

  it('ignores legacy default_price and does not use it as pricing truth (Rule 26)', () => {
    const inputWithLegacy = {
      default_price: '100',
      minimum_slot_price: null,
      maximum_slot_price: null,
    } as unknown as {
      pricing_configured?: boolean
      minimum_slot_price?: string | null
      maximum_slot_price?: string | null
    }

    const result = formatCourtPricingSummary(inputWithLegacy)

    expect(result).toBe(COURT_PRICING_UNCONFIGURED_LABEL)
    expect(result).not.toContain('100')
  })

  it('handles both null min and max as unconfigured without inventing 0', () => {
    const result = formatCourtPricingSummary({
      minimum_slot_price: null,
      maximum_slot_price: null,
    })

    expect(result).toBe(COURT_PRICING_UNCONFIGURED_LABEL)
  })

  it('formats decimals correctly using shared money formatter', () => {
    const result = formatCourtPricingSummary({
      pricing_configured: true,
      minimum_slot_price: '150.00',
      maximum_slot_price: '250.00',
    })

    expect(result).toBe('150.00 - 250.00 جنيه')
  })
})
