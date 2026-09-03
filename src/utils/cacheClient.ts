import type { CacheEntry } from '@/utils/cacheRegistry'

interface CacheEnvelope<T> {
  version: number
  updatedAt: number
  data: T
}

export interface ReadCacheOptions {
  maxAgeMs?: number
  allowLegacyVersionless?: boolean
}

type CacheOutcome =
  | 'hit'
  | 'miss'
  | 'expired'
  | 'invalid'
  | 'version_mismatch'
  | 'legacy_upgraded'
  | 'storage_unavailable'
  | 'write'
  | 'remove'

const canUseStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'

const logCacheOutcome = (entry: CacheEntry, action: 'read' | 'write' | 'remove', outcome: CacheOutcome) => {
  if (!import.meta.env.DEV) return
  console.info(`[cache] ${action} ${entry.key} -> ${outcome}`)
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

export const readRawStorage = (key: string): string | null => {
  if (!canUseStorage()) return null
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

export const writeRawStorage = (key: string, value: string) => {
  if (!canUseStorage()) return
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Ignore storage write errors.
  }
}

export const removeRawStorage = (key: string) => {
  if (!canUseStorage()) return
  try {
    window.localStorage.removeItem(key)
  } catch {
    // Ignore storage remove errors.
  }
}

export const listStorageKeys = () => {
  if (!canUseStorage()) return []
  const keys: string[] = []
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i)
    if (key) keys.push(key)
  }
  return keys
}

export const listSessionStorageKeys = () => {
  if (typeof window === 'undefined' || typeof window.sessionStorage === 'undefined') return []
  const keys: string[] = []
  for (let i = 0; i < window.sessionStorage.length; i++) {
    const key = window.sessionStorage.key(i)
    if (key) keys.push(key)
  }
  return keys
}

export const removeRawSessionStorage = (key: string) => {
  if (typeof window === 'undefined' || typeof window.sessionStorage === 'undefined') return
  try {
    window.sessionStorage.removeItem(key)
  } catch {
    // Ignore storage remove errors.
  }
}

const parseEnvelope = <T>(
  raw: string,
  entry: CacheEntry,
  allowLegacyVersionless: boolean,
): { envelope: CacheEnvelope<T>; upgradedFromLegacy: boolean } | null => {
  const parsed = JSON.parse(raw) as unknown
  if (!isRecord(parsed) || typeof parsed.updatedAt !== 'number' || !('data' in parsed)) {
    return null
  }

  const maybeVersion = parsed.version
  if (typeof maybeVersion === 'number') {
    return {
      envelope: {
        version: maybeVersion,
        updatedAt: parsed.updatedAt,
        data: parsed.data as T,
      },
      upgradedFromLegacy: false,
    }
  }

  if (!allowLegacyVersionless) {
    return null
  }

  return {
    envelope: {
      version: entry.version,
      updatedAt: parsed.updatedAt,
      data: parsed.data as T,
    },
    upgradedFromLegacy: true,
  }
}

export const readCache = <T>(entry: CacheEntry, options: ReadCacheOptions = {}): T | null => {
  if (!canUseStorage()) {
    logCacheOutcome(entry, 'read', 'storage_unavailable')
    return null
  }

  const raw = readRawStorage(entry.key)
  if (!raw) {
    logCacheOutcome(entry, 'read', 'miss')
    return null
  }

  try {
    const parsed = parseEnvelope<T>(raw, entry, options.allowLegacyVersionless === true)
    if (!parsed) {
      logCacheOutcome(entry, 'read', 'invalid')
      return null
    }

    const { envelope, upgradedFromLegacy } = parsed

    if (upgradedFromLegacy) {
      writeCache(entry, envelope.data)
      logCacheOutcome(entry, 'read', 'legacy_upgraded')
    }

    if (envelope.version !== entry.version) {
      logCacheOutcome(entry, 'read', 'version_mismatch')
      return null
    }

    const ttl = options.maxAgeMs ?? entry.ttlMs
    if (typeof ttl === 'number' && ttl >= 0 && Date.now() - envelope.updatedAt > ttl) {
      logCacheOutcome(entry, 'read', 'expired')
      return null
    }

    logCacheOutcome(entry, 'read', 'hit')
    return envelope.data
  } catch {
    logCacheOutcome(entry, 'read', 'invalid')
    return null
  }
}

export const writeCache = <T>(entry: CacheEntry, data: T) => {
  if (!canUseStorage()) {
    logCacheOutcome(entry, 'write', 'storage_unavailable')
    return
  }

  const envelope: CacheEnvelope<T> = {
    version: entry.version,
    updatedAt: Date.now(),
    data,
  }

  writeRawStorage(entry.key, JSON.stringify(envelope))
  logCacheOutcome(entry, 'write', 'write')
}

export const removeCache = (entry: CacheEntry) => {
  removeRawStorage(entry.key)
  logCacheOutcome(entry, 'remove', 'remove')
}
