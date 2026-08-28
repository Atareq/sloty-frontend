export interface FormatMoneyAmountOptions {
  suffix?: string
}

function formatNumericMoney(value: string): string {
  const [integerPart, decimalPart] = value.split('.')
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')

  return decimalPart !== undefined
    ? `${formattedInteger}.${decimalPart}`
    : formattedInteger
}

/**
 * Formats backend money strings without changing their decimal precision.
 */
export function isNonZeroMoneyAmount(
  value: string | number | null | undefined,
): boolean {
  if (value === null || value === undefined || value === '') {
    return false
  }

  const numericValue = Number(value)

  return Number.isFinite(numericValue) && numericValue !== 0
}

export function formatMoneyAmount(
  value: string | number | null | undefined,
  options: FormatMoneyAmountOptions = {},
): string {
  if (value === null || value === undefined || value === '') {
    return '-'
  }

  const suffix = options.suffix ?? 'جنيه'
  const rawValue = String(value)
  const formattedValue =
    typeof value === 'number' && value === 0
      ? '0'
      : formatNumericMoney(rawValue)

  return suffix ? `${formattedValue} ${suffix}` : formattedValue
}
