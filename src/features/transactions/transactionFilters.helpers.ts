/**
 * Converts a checkbox pair into the single scalar value accepted by the API.
 * Neither or both selected deliberately mean "all", so the query is omitted.
 */
export function getSinglePairValue<Value extends string>(
  values: Value[],
): Value | undefined {
  return values.length === 1 ? values[0] : undefined
}
