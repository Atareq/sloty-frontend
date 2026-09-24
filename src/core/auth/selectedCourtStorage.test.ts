import { describe, expect, it, beforeEach } from 'vitest'
import {
  clearSelectedCourtId,
  getSelectedCourtId,
  saveSelectedCourtId,
} from './selectedCourtStorage'

describe('selectedCourtStorage', () => {
  beforeEach(() => {
    clearSelectedCourtId()
  })

  it('saves, reads, and clears the selected court ID', () => {
    expect(getSelectedCourtId()).toBeNull()

    saveSelectedCourtId(42)
    expect(getSelectedCourtId()).toBe(42)

    clearSelectedCourtId()
    expect(getSelectedCourtId()).toBeNull()
  })

  it('returns null when storage contains a non-numeric value', () => {
    sessionStorage.setItem('sloty.auth.selected_court_id', 'not-a-number')
    expect(getSelectedCourtId()).toBeNull()
    clearSelectedCourtId()
  })

  it('returns null when storage is empty', () => {
    expect(getSelectedCourtId()).toBeNull()
  })
})
