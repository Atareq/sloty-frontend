import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearReloadAttempts,
  createReleaseManager,
  fetchDeployedVersion,
  getReloadAttempt,
  recordReloadAttempt,
  RELOAD_ATTEMPT_STORAGE_KEY_PREFIX,
} from './releaseManager'

function createMockStorage(): Storage {
  const store = new Map<string, string>()
  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, String(value))
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key)
    }),
    clear: vi.fn(() => {
      store.clear()
    }),
    key: vi.fn((index: number) => Array.from(store.keys())[index] ?? null),
    get length() {
      return store.size
    },
  }
}

describe('releaseManager', () => {
  let mockStorage: Storage

  beforeEach(() => {
    vi.clearAllMocks()
    mockStorage = createMockStorage()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('fetchDeployedVersion', () => {
    it('fetches version.json bypassing cache and returns parsed release and commit', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          release: 'v0.9.0',
          commit: 'abcdef1234567890abcdef1234567890abcdef12',
        }),
      })

      const result = await fetchDeployedVersion(mockFetch as unknown as typeof fetch)

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toMatch(/^\/version\.json\?check=\d+$/)
      expect(options).toMatchObject({
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      })
      expect(result).toEqual({
        release: 'v0.9.0',
        commit: 'abcdef1234567890abcdef1234567890abcdef12',
      })
    })

    it('returns null when network response is not ok', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      })

      const result = await fetchDeployedVersion(mockFetch as unknown as typeof fetch)

      expect(result).toBeNull()
    })

    it('returns null when network throws an error', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network offline'))

      const result = await fetchDeployedVersion(mockFetch as unknown as typeof fetch)

      expect(result).toBeNull()
    })

    it('returns null when response body is not valid version JSON', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ invalid: 'data' }),
      })

      const result = await fetchDeployedVersion(mockFetch as unknown as typeof fetch)

      expect(result).toBeNull()
    })
  })

  describe('reload attempt storage guards', () => {
    it('records and checks reload attempts for target commits', () => {
      expect(getReloadAttempt('commit-123', mockStorage)).toBe(false)

      recordReloadAttempt('commit-123', mockStorage)

      expect(getReloadAttempt('commit-123', mockStorage)).toBe(true)
      expect(mockStorage.setItem).toHaveBeenCalledWith(
        `${RELOAD_ATTEMPT_STORAGE_KEY_PREFIX}commit-123`,
        'true',
      )
    })

    it('clears reload attempts across all keys', () => {
      recordReloadAttempt('commit-1', mockStorage)
      recordReloadAttempt('commit-2', mockStorage)

      expect(getReloadAttempt('commit-1', mockStorage)).toBe(true)
      expect(getReloadAttempt('commit-2', mockStorage)).toBe(true)

      clearReloadAttempts(mockStorage)

      expect(getReloadAttempt('commit-1', mockStorage)).toBe(false)
      expect(getReloadAttempt('commit-2', mockStorage)).toBe(false)
    })
  })

  describe('ReleaseManager orchestration', () => {
    it('does not trigger update when running commit matches deployed commit (Requirement A)', async () => {
      const applyUpdate = vi.fn()
      const manager = createReleaseManager({
        getBuildInfo: () => ({
          release: 'v0.9.0',
          commit: 'commit-aaa',
          shortCommit: 'commit-',
        }),
        fetchVersion: async () => ({
          release: 'v0.9.0',
          commit: 'commit-aaa',
        }),
        storage: mockStorage,
        applyUpdate,
      })

      // Simulate a leftover guard from a past reload
      recordReloadAttempt('commit-aaa', mockStorage)

      const result = await manager.check({ force: true })

      expect(result.status).toBe('current')
      expect(applyUpdate).not.toHaveBeenCalled()
      // Guard should be cleaned up now that we're on the target commit
      expect(getReloadAttempt('commit-aaa', mockStorage)).toBe(false)
    })

    it('automatically triggers update path when running commit differs from deployed (Requirements B, D)', async () => {
      const applyUpdate = vi.fn().mockResolvedValue(undefined)
      const manager = createReleaseManager({
        getBuildInfo: () => ({
          release: 'v0.8.0',
          commit: 'commit-aaa',
          shortCommit: 'commit-',
        }),
        fetchVersion: async () => ({
          release: 'v0.9.0',
          commit: 'commit-bbb',
        }),
        storage: mockStorage,
        applyUpdate,
      })

      const result = await manager.check({ force: true })

      expect(result.status).toBe('updating')
      expect(result.runningCommit).toBe('commit-aaa')
      expect(result.deployedCommit).toBe('commit-bbb')
      expect(applyUpdate).toHaveBeenCalledTimes(1)
      expect(applyUpdate).toHaveBeenCalledWith('commit-bbb')
      // Target commit reload attempt should be recorded
      expect(getReloadAttempt('commit-bbb', mockStorage)).toBe(true)
    })

    it('prevents infinite reload loops when the same target commit was already attempted (Requirement E)', async () => {
      const applyUpdate = vi.fn()
      const manager = createReleaseManager({
        getBuildInfo: () => ({
          release: 'v0.8.0',
          commit: 'commit-aaa',
          shortCommit: 'commit-',
        }),
        fetchVersion: async () => ({
          release: 'v0.9.0',
          commit: 'commit-bbb',
        }),
        storage: mockStorage,
        applyUpdate,
      })

      // Pre-record that commit-bbb was already attempted in this session
      recordReloadAttempt('commit-bbb', mockStorage)

      const result = await manager.check({ force: true })

      expect(result.status).toBe('already_attempted')
      expect(applyUpdate).not.toHaveBeenCalled()
    })

    it('gracefully tolerates network failures without reload or breaking the app (Requirement F)', async () => {
      const applyUpdate = vi.fn()
      const manager = createReleaseManager({
        getBuildInfo: () => ({
          release: 'v0.9.0',
          commit: 'commit-aaa',
          shortCommit: 'commit-',
        }),
        fetchVersion: async () => null, // network failure
        storage: mockStorage,
        applyUpdate,
      })

      const result = await manager.check({ force: true })

      expect(result.status).toBe('network_error')
      expect(result.runningCommit).toBe('commit-aaa')
      expect(applyUpdate).not.toHaveBeenCalled()
    })

    it('bypasses reload in local dev mode when commit is "local"', async () => {
      const applyUpdate = vi.fn()
      const manager = createReleaseManager({
        getBuildInfo: () => ({
          release: 'dev',
          commit: 'local',
          shortCommit: 'local',
        }),
        fetchVersion: async () => ({
          release: 'v0.9.0',
          commit: 'commit-bbb',
        }),
        storage: mockStorage,
        applyUpdate,
      })

      const result = await manager.check({ force: true })

      expect(result.status).toBe('dev_bypass')
      expect(applyUpdate).not.toHaveBeenCalled()
    })

    it('performs release check on start (Requirement G)', () => {
      const fetchVersion = vi.fn().mockResolvedValue({
        release: 'v0.9.0',
        commit: 'commit-aaa',
      })
      const manager = createReleaseManager({
        getBuildInfo: () => ({
          release: 'v0.9.0',
          commit: 'commit-aaa',
          shortCommit: 'commit-',
        }),
        fetchVersion,
        storage: mockStorage,
      })

      manager.start()

      expect(fetchVersion).toHaveBeenCalledTimes(1)
      manager.stop()
    })

    it('performs release check on visibility resume subject to throttle (Requirement H)', async () => {
      let currentTime = 1_000_000
      vi.spyOn(Date, 'now').mockImplementation(() => currentTime)

      const fetchVersion = vi.fn().mockResolvedValue({
        release: 'v0.9.0',
        commit: 'commit-aaa',
      })
      const manager = createReleaseManager({
        getBuildInfo: () => ({
          release: 'v0.9.0',
          commit: 'commit-aaa',
          shortCommit: 'commit-',
        }),
        fetchVersion,
        storage: mockStorage,
        minCheckIntervalMs: 5 * 60 * 1000,
      })

      manager.start()
      await Promise.resolve() // let start check resolve
      expect(fetchVersion).toHaveBeenCalledTimes(1) // from start()

      // Document visibility change to visible before 5 minutes
      currentTime += 60 * 1000 // 1 minute later
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        configurable: true,
      })
      document.dispatchEvent(new Event('visibilitychange'))

      // Should be throttled, no extra fetch
      expect(fetchVersion).toHaveBeenCalledTimes(1)

      // Advance past 5-minute throttle
      currentTime += 5 * 60 * 1000 // 6 minutes total
      document.dispatchEvent(new Event('visibilitychange'))
      await Promise.resolve()

      // Now it should have checked again
      expect(fetchVersion).toHaveBeenCalledTimes(2)

      manager.stop()
    })
  })
})
