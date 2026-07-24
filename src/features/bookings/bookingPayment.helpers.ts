/**
 * Checks backend money strings without doing broader currency parsing.
 *
 * Missing, empty, invalid, and zero values are treated as not remaining.
 */
export function hasPositiveRemainingAmount(
  value?: string | number | null,
): boolean {
  if (value === null || value === undefined || value === '') {
    return false
  }

  const remaining = Number(value)

  return Number.isFinite(remaining) && remaining > 0
}
