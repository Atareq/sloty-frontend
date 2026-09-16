import type { Court } from './courts.types'

/**
 * Formats court pricing summary for list cards and details.
 *
 * In the updated backend schema, courts no longer have a single `default_price`.
 * Instead, pricing is configured via pricing periods, providing:
 * - `pricing_configured`: boolean
 * - `minimum_slot_price`: string | null
 * - `maximum_slot_price`: string | null
 *
 * Falls back to `default_price` if present (e.g. older fixtures or transitional responses).
 */
export function formatCourtPrice(
  court: Partial<
    Pick<
      Court,
      'pricing_configured' | 'minimum_slot_price' | 'maximum_slot_price' | 'default_price'
    >
  >,
): string {
  if (court.pricing_configured && court.minimum_slot_price && court.maximum_slot_price) {
    if (court.minimum_slot_price === court.maximum_slot_price) {
      return `${court.minimum_slot_price} جنيه`
    }
    return `من ${court.minimum_slot_price} إلى ${court.maximum_slot_price} جنيه`
  }

  if (court.default_price) {
    return `${court.default_price} جنيه`
  }

  return 'غير محدد'
}

