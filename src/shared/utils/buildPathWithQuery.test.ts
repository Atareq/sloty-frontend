import { describe, expect, it } from 'vitest'
import { buildPathWithQuery } from './buildPathWithQuery'

describe('buildPathWithQuery', () => {
  it('skips null, undefined, and empty string values', () => {
    expect(
      buildPathWithQuery('/transactions', {
        date: '',
        page: null,
        payment_method: undefined,
      }),
    ).toBe('/transactions')
  })

  it('keeps false and zero query values', () => {
    expect(
      buildPathWithQuery('/transactions', {
        is_cancelled: false,
        page: 0,
      }),
    ).toBe('/transactions?is_cancelled=false&page=0')
  })

  it('encodes string values', () => {
    expect(
      buildPathWithQuery('/transactions', {
        search: 'أحمد علي',
      }),
    ).toBe('/transactions?search=%D8%A3%D8%AD%D9%85%D8%AF+%D8%B9%D9%84%D9%8A')
  })
})
