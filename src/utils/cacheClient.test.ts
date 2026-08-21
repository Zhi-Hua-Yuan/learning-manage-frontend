import { beforeEach, describe, expect, it, vi } from 'vitest'

import { readCache, writeCache } from './cacheClient'
import type { CacheEntry } from './cacheRegistry'

const entry: CacheEntry = {
  key: 'tick:test-cache:v1',
  ttlMs: 1000,
  version: 1,
  owner: 'test',
}

describe('cache client', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date('2026-08-21T00:00:00.000Z') })
  })

  it('writes and reads a versioned envelope', () => {
    writeCache(entry, { value: 1 })

    expect(JSON.parse(window.localStorage.getItem(entry.key) || '{}')).toEqual({
      version: 1,
      updatedAt: new Date('2026-08-21T00:00:00.000Z').getTime(),
      data: { value: 1 },
    })
    expect(readCache(entry)).toEqual({ value: 1 })
  })

  it('returns null for missing, malformed, or mismatched entries', () => {
    expect(readCache(entry)).toBeNull()

    window.localStorage.setItem(entry.key, '{bad json')
    expect(readCache(entry)).toBeNull()

    window.localStorage.setItem(entry.key, JSON.stringify({ version: 2, updatedAt: Date.now(), data: 1 }))
    expect(readCache(entry)).toBeNull()
  })

  it('expires entries after the configured age', () => {
    writeCache(entry, 'value')
    vi.advanceTimersByTime(1001)

    expect(readCache(entry)).toBeNull()
  })

  it('upgrades an allowed versionless legacy envelope', () => {
    window.localStorage.setItem(entry.key, JSON.stringify({ updatedAt: Date.now(), data: ['legacy'] }))

    expect(readCache<string[]>(entry, { allowLegacyVersionless: true })).toEqual(['legacy'])
    expect(JSON.parse(window.localStorage.getItem(entry.key) || '{}').version).toBe(1)
  })

  it('rejects a versionless envelope when legacy mode is disabled', () => {
    window.localStorage.setItem(entry.key, JSON.stringify({ updatedAt: Date.now(), data: ['legacy'] }))

    expect(readCache(entry)).toBeNull()
  })

  it('supports an explicit unlimited age', () => {
    writeCache(entry, 'old-but-valid')
    vi.advanceTimersByTime(100000)

    expect(readCache(entry, { maxAgeMs: Number.POSITIVE_INFINITY })).toBe('old-but-valid')
  })
})
