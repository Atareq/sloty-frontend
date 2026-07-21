import { describe, expect, it } from 'vitest'
import {
  getBooleanQueryParam,
  getNumberQueryParam,
  getQueryParam,
  removeQueryParam,
  setQueryParam,
  toQueryObject,
} from './queryParams'

describe('queryParams', () => {
  it('reads string, boolean, and number values', () => {
    const search = '?settlement_status=unsettled&is_cancelled=false&page=2'

    expect(getQueryParam(search, 'settlement_status')).toBe('unsettled')
    expect(getBooleanQueryParam(search, 'is_cancelled')).toBe(false)
    expect(getNumberQueryParam(search, 'page')).toBe(2)
  })

  it('removes and sets query params', () => {
    expect(removeQueryParam('?date=2026-07-21&page=2', 'page')).toBe(
      '?date=2026-07-21',
    )
    expect(setQueryParam('?date=2026-07-21', 'needs_action', true)).toBe(
      '?date=2026-07-21&needs_action=true',
    )
    expect(setQueryParam('?date=2026-07-21', 'date', '')).toBe('')
  })

  it('converts search params to a plain object', () => {
    expect(toQueryObject('?court=3&payment_method=CASH')).toEqual({
      court: '3',
      payment_method: 'CASH',
    })
  })
})
