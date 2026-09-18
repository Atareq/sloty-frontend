import { afterEach, describe, expect, it } from 'vitest'
import { getAppLanguage } from './language'

describe('getAppLanguage', () => {
  afterEach(() => {
    document.documentElement.lang = 'ar'
  })

  it('treats missing or Arabic document language as ar', () => {
    document.documentElement.lang = ''
    expect(getAppLanguage()).toBe('ar')
    expect(getAppLanguage('ar')).toBe('ar')
    expect(getAppLanguage('ar-EG')).toBe('ar')
  })

  it('treats English document language as en', () => {
    document.documentElement.lang = 'en'
    expect(getAppLanguage()).toBe('en')
    expect(getAppLanguage('en-US')).toBe('en')
  })
})
