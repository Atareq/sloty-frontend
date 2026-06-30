import { describe, expect, it } from 'vitest'
import { API_BASE_URL } from './api'

describe('API_BASE_URL', () => {
  it('keeps a trailing slash for relative endpoint resolution', () => {
    expect(API_BASE_URL).toMatch(/\/$/)
  })
})
