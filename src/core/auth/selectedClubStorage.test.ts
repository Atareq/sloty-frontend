import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearSelectedClubSlug,
  getSelectedClubSlug,
  saveSelectedClubSlug,
} from './selectedClubStorage'

describe('selectedClubStorage', () => {
  beforeEach(() => {
    clearSelectedClubSlug()
  })

  it('saves, reads, and clears the selected club slug', () => {
    saveSelectedClubSlug('demo-football-club')

    expect(getSelectedClubSlug()).toBe('demo-football-club')

    clearSelectedClubSlug()

    expect(getSelectedClubSlug()).toBeNull()
  })
})
