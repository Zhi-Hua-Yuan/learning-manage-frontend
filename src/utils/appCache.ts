import {
  CACHE_REGISTRY,
  getActorAiPlannerDraftCacheEntry,
  getActorScopedCacheEntry,
  getActorTaskListReplanStateCacheEntry,
  getActorTaskTodayAiOrderCacheEntry,
} from '@/utils/cacheRegistry'
import { readCache, readRawStorage, removeCache, writeCache } from '@/utils/cacheClient'

const readLegacyString = (key: string): string | null => {
  const raw = readRawStorage(key)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as unknown
    return typeof parsed === 'string' ? parsed : null
  } catch {
    return raw
  }
}

export const readSelectedProjectIdCache = () => {
  const entry = getActorScopedCacheEntry(CACHE_REGISTRY.selectedProjectId)
  if (!entry) return ''
  const cached = readCache<string>(entry)
  if (typeof cached === 'string' && cached) return cached
  return ''
}

export const writeSelectedProjectIdCache = (projectId: string) => {
  const entry = getActorScopedCacheEntry(CACHE_REGISTRY.selectedProjectId)
  if (!entry) return
  if (!projectId) {
    removeCache(entry)
    return
  }
  writeCache(entry, projectId)
}

export const clearSelectedProjectIdCache = () => {
  const entry = getActorScopedCacheEntry(CACHE_REGISTRY.selectedProjectId)
  if (entry) removeCache(entry)
}

export const readThemeModeCache = () => {
  const entry = CACHE_REGISTRY.themeMode
  const cached = readCache<string>(entry)
  if (typeof cached === 'string') return cached

  const legacy = readLegacyString(entry.key)
  if (!legacy) return null
  writeCache(entry, legacy)
  return legacy
}

export const writeThemeModeCache = (mode: string) => {
  writeCache(CACHE_REGISTRY.themeMode, mode)
}

export const readAiPlannerDraftCache = <T>(): T | null => {
  const entry = getActorAiPlannerDraftCacheEntry()
  if (!entry) return null
  const cached = readCache<T>(entry)
  if (cached) return cached
  return null
}

export const writeAiPlannerDraftCache = <T>(payload: T) => {
  const entry = getActorAiPlannerDraftCacheEntry()
  if (entry) writeCache(entry, payload)
}

export const clearAiPlannerDraftCache = () => {
  const entry = getActorAiPlannerDraftCacheEntry()
  if (entry) removeCache(entry)
}

export const readTaskTodayAiOrderCache = <T>(): T | null => {
  const entry = getActorTaskTodayAiOrderCacheEntry()
  if (!entry) return null
  const cached = readCache<T>(entry)
  if (cached) return cached
  return null
}

export const writeTaskTodayAiOrderCache = <T>(payload: T) => {
  const entry = getActorTaskTodayAiOrderCacheEntry()
  if (entry) writeCache(entry, payload)
}

export const clearTaskTodayAiOrderCache = () => {
  const entry = getActorTaskTodayAiOrderCacheEntry()
  if (entry) removeCache(entry)
}

export const readTaskListReplanStateCache = <T>(): T | null => {
  const entry = getActorTaskListReplanStateCacheEntry()
  if (!entry) return null
  const cached = readCache<T>(entry)
  if (cached) return cached
  return null
}

export const writeTaskListReplanStateCache = <T>(payload: T) => {
  const entry = getActorTaskListReplanStateCacheEntry()
  if (entry) writeCache(entry, payload)
}

export const clearTaskListReplanStateCache = () => {
  const entry = getActorTaskListReplanStateCacheEntry()
  if (entry) removeCache(entry)
}
