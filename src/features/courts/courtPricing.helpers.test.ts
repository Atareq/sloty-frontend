import { describe, expect, it } from 'vitest'
import { formatCourtPrice } from './courtPricing.helpers'

describe('formatCourtPrice', () => {
  it('formats single price when min and max are equal', () => {
    const result = formatCourtPrice({
      pricing_configured: true,
      minimum_slot_price: '200.00',
      maximum_slot_price: '200.00',
    })
    expect(result).toBe('200.00 جنيه')
  })

  it('formats price range when min and max differ', () => {
    const result = formatCourtPrice({
      pricing_configured: true,
      minimum_slot_price: '150.00',
      maximum_slot_price: '250.00',
    })
    expect(result).toBe('من 150.00 إلى 250.00 جنيه')
  })

  it('falls back to default_price if pricing_configured is not set', () => {
    const result = formatCourtPrice({
      default_price: '300.00',
    })
    expect(result).toBe('300.00 جنيه')
  })

  it('returns non-configured notice when no price is available', () => {
    const result = formatCourtPrice({})
    expect(result).toBe('غير محدد')
  })
})

