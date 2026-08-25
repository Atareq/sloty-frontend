import { describe, expect, it } from 'vitest'
import { getSinglePairValue } from './transactionFilters.helpers'

describe('getSinglePairValue', () => {
  it.each([
    [[], undefined],
    [['unsettled'], 'unsettled'],
    [['settled'], 'settled'],
    [['unsettled', 'settled'], undefined],
  ] as const)('maps settlement pair %j to %s', (values, expected) => {
    expect(getSinglePairValue([...values])).toBe(expected)
  })

  it.each([
    [[], undefined],
    [['false'], 'false'],
    [['true'], 'true'],
    [['false', 'true'], undefined],
  ] as const)('maps cancellation pair %j to %s', (values, expected) => {
    expect(getSinglePairValue([...values])).toBe(expected)
  })
})
