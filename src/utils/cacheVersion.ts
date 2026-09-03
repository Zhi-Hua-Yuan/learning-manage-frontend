import { listSessionStorageKeys, listStorageKeys, removeRawSessionStorage } from '@/utils/cacheClient'

const BACKEND_CACHE_VERSION_KEY = 'tick_backend_cache_version'
const BACKEND_CACHE_RELOAD_LOCK_KEY = 'tick_backend_cache_reload_lock'

const canUseLocalStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
const canUseSessionStorage = () => typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined'

const toVersionString = (value: unknown): string | null => {
  if (typeof value === 'string') {
    const normalized = value.trim()
    return normalized ? normalized : null
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }

  return null
}

const readHeaderValue = (headers: unknown, headerName: string): unknown => {
  if (!headers || typeof headers !== 'object') return null

  const record = headers as Record<string, unknown>
  if (typeof (headers as { get?: unknown }).get === 'function') {
    try {
      const value = (headers as { get: (name: string) => unknown }).get(headerName)
      if (value !== undefined && value !== null && value !== '') return value
    } catch {
      // Ignore header getter errors.
    }
  }

  const normalizedName = headerName.toLowerCase()
  for (const [key, value] of Object.entries(record)) {
    if (key.toLowerCase() === normalizedName) {
      return value
    }
  }

  return null
}

const extractVersionFromPayload = (payload: unknown): string | null => {
  if (!payload || typeof payload !== 'object') return null

  const record = payload as Record<string, unknown>
  const directCandidates = [record.cacheVersion, record.version, record.dataVersion]
  for (const candidate of directCandidates) {
    const version = toVersionString(candidate)
    if (version) return version
  }

  if (!record.data || typeof record.data !== 'object') return null

  const nested = record.data as Record<string, unknown>
  const nestedCandidates = [nested.cacheVersion, nested.version, nested.dataVersion]
  for (const candidate of nestedCandidates) {
    const version = toVersionString(candidate)
    if (version) return version
  }

  return null
}

const extractVersionFromHeaders = (headers: unknown): string | null => {
  const headerCandidates = ['x-cache-version', 'x-data-version', 'x-app-version', 'x-version']
  for (const headerName of headerCandidates) {
    const version = toVersionString(readHeaderValue(headers, headerName))
    if (version) return version
  }
  return null
}

const LEGACY_LOCAL_STORAGE_KEYS = new Set([
  'tick_selectedProjectId',
  'tick:cache:project-progress:v2',
  'tick_aiPlannerDraft_v1',
])
const LEGACY_LOCAL_STORAGE_PREFIXES = [
  'tick:cache:project-list:',
  'tick:cache:task-list:v1:',
  'tick:cache:task-list:all:v1',
  'tick:cache:task-today-ai-order:v1',
  'tick:cache:task-list-replan-state:v1',
]
const LEGACY_SESSION_STORAGE_PREFIXES = ['ai:draft:confirm-operation:']

const matchesLegacyKey = (key: string, exactKeys: Set<string>, prefixes: string[]) => (
  exactKeys.has(key) || prefixes.some((prefix) => key.startsWith(prefix) && !key.includes(':actor-'))
)

export const dropLegacyBusinessCacheKeys = () => {
  if (canUseLocalStorage()) {
    listStorageKeys()
      .filter((key) => matchesLegacyKey(key, LEGACY_LOCAL_STORAGE_KEYS, LEGACY_LOCAL_STORAGE_PREFIXES))
      .forEach((key) => window.localStorage.removeItem(key))
  }

  if (canUseSessionStorage()) {
    listSessionStorageKeys()
      .filter((key) => matchesLegacyKey(key, new Set(), LEGACY_SESSION_STORAGE_PREFIXES))
      .forEach(removeRawSessionStorage)
  }
}

const clearBackendInvalidatedCaches = () => {
  if (!canUseLocalStorage()) return

  const invalidatedPrefixes = [
    'tick_selectedProjectId:actor-',
    'tick:cache:project-list:',
    'tick:cache:project-progress:v2:actor-',
    'tick:cache:task-list:v1:',
    'tick:cache:task-list:all:v1:',
    'tick:cache:task-today-ai-order:v1:',
    'tick:cache:task-list-replan-state:v1:',
  ]

  listStorageKeys()
    .filter((key) => invalidatedPrefixes.some((prefix) => key.startsWith(prefix)))
    .forEach((key) => window.localStorage.removeItem(key))
}

const shouldReloadForVersion = (nextVersion: string) => {
  if (!canUseSessionStorage()) return true
  const lockedVersion = window.sessionStorage.getItem(BACKEND_CACHE_RELOAD_LOCK_KEY) || ''
  if (lockedVersion === nextVersion) return false
  window.sessionStorage.setItem(BACKEND_CACHE_RELOAD_LOCK_KEY, nextVersion)
  return true
}

export interface BackendCacheVersionSyncResult {
  changed: boolean
  currentVersion: string
  previousVersion: string
  shouldReload: boolean
}

export const syncBackendCacheVersion = (
  headers: unknown,
  payload: unknown,
): BackendCacheVersionSyncResult | null => {
  if (!canUseLocalStorage()) return null

  const nextVersion = extractVersionFromHeaders(headers) || extractVersionFromPayload(payload)
  if (!nextVersion) return null

  dropLegacyBusinessCacheKeys()

  const previousVersion = (window.localStorage.getItem(BACKEND_CACHE_VERSION_KEY) || '').trim()
  if (!previousVersion) {
    window.localStorage.setItem(BACKEND_CACHE_VERSION_KEY, nextVersion)
    return {
      changed: false,
      currentVersion: nextVersion,
      previousVersion: '',
      shouldReload: false,
    }
  }

  if (previousVersion === nextVersion) {
    return {
      changed: false,
      currentVersion: nextVersion,
      previousVersion,
      shouldReload: false,
    }
  }

  clearBackendInvalidatedCaches()
  window.localStorage.setItem(BACKEND_CACHE_VERSION_KEY, nextVersion)

  return {
    changed: true,
    currentVersion: nextVersion,
    previousVersion,
    shouldReload: shouldReloadForVersion(nextVersion),
  }
}
