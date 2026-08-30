import { afterEach, describe, expect, it, vi } from 'vitest'
import { offlineRepositories } from '../repositories/offlineRepositories'
import {
  safelyClearUserOperationalData,
  safelyPersistOfflineContext,
} from './offlineStorageSafety'

describe('offline storage failure safety', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('handles an initialization/write failure without an uncaught application error', async () => {
    vi.spyOn(offlineRepositories, 'saveOfflineContext').mockRejectedValueOnce(
      new Error('customer phone +201111111111'),
    )
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(
      safelyPersistOfflineContext({
        scope: { userId: 1, clubSlug: 'club-a' },
        displayName: 'اسم حساس',
        isPlatformAdmin: false,
        membership: {
          id: 10,
          role: 'STAFF',
          club: {
            id: 1,
            slug: 'club-a',
            name: 'Club A',
            is_active: true,
          },
          court: { id: 7, name: 'ملعب 1' },
        },
        lastVerifiedAt: '2026-08-30T12:00:00.000Z',
      }),
    ).resolves.toBe(false)
    expect(consoleError).toHaveBeenCalledWith('تعذر تحديث التخزين المحلي الآمن.')
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain('اسم حساس')
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain('+201111111111')
  })

  it('surfaces cleanup failure safely without leaking record or error contents', async () => {
    vi.spyOn(offlineRepositories, 'clearUserOperationalData').mockRejectedValueOnce(
      new Error('token=secret customer=حساس'),
    )
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(safelyClearUserOperationalData(1)).resolves.toBe(false)
    expect(consoleError).toHaveBeenCalledWith(
      'تعذر مسح التخزين المحلي الآمن بالكامل.',
    )
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain('secret')
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain('حساس')
  })
})
