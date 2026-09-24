import { formatMoneyAmount } from '../../shared/utils/money'

/**
 * Read-only summary input from backend Court responses.
 * Never includes default_price or any legacy fallback fields.
 */
export interface CourtPricingSummaryInput {
  pricing_configured?: boolean | null
  minimum_slot_price?: string | number | null
  maximum_slot_price?: string | number | null
}

export const COURT_PRICING_UNCONFIGURED_LABEL = 'لم يتم ضبط الأسعار'

/**
 * Formats informational court pricing summary using backend-provided summary truth.
 *
 * Rules:
 * - pricing_configured === false -> 'لم يتم ضبط الأسعار'
 * - min === max -> single price (e.g. '200 جنيه'), never '200 - 200'
 * - min !== max -> range (e.g. '200 - 300 جنيه')
 * - both null/empty -> 'لم يتم ضبط الأسعار' (never invent 0)
 * - Zero fallback to default_price or period calculations
 */
export function formatCourtPricingSummary(
  court: CourtPricingSummaryInput,
): string {
  if (court.pricing_configured === false) {
    return COURT_PRICING_UNCONFIGURED_LABEL
  }

  const min = court.minimum_slot_price
  const max = court.maximum_slot_price

  const hasMin = min !== null && min !== undefined && min !== ''
  const hasMax = max !== null && max !== undefined && max !== ''

  if (!hasMin && !hasMax) {
    return COURT_PRICING_UNCONFIGURED_LABEL
  }

  const formattedMin = hasMin ? formatMoneyAmount(min) : null
  const formattedMax = hasMax ? formatMoneyAmount(max) : null

  const isSinglePrice =
    hasMin &&
    hasMax &&
    (String(min) === String(max) || Number(min) === Number(max))

  if (isSinglePrice && formattedMin) {
    return formattedMin
  }

  if (hasMin && hasMax && formattedMin && formattedMax) {
    const minNoSuffix = formatMoneyAmount(min, { suffix: '' })
    return `${minNoSuffix} - ${formattedMax}`
  }

  return formattedMin ?? formattedMax ?? COURT_PRICING_UNCONFIGURED_LABEL
}
