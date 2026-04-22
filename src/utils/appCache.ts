import { CACHE_REGISTRY } from '@/utils/cacheRegistry'
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
  const entry = CACHE_REGISTRY.selectedProjectId
  const cached = readCache<string>(entry)
  if (typeof cached === 'string' && cached) return cached

  const legacy = readLegacyString(entry.key)
  if (!legacy) return ''
  writeCache(entry, legacy)
  return legacy
}

export const writeSelectedProjectIdCache = (projectId: string) => {
  const entry = CACHE_REGISTRY.selectedProjectId
  if (!projectId) {
    removeCache(entry)
    return
  }
  writeCache(entry, projectId)
}

export const clearSelectedProjectIdCache = () => {
  removeCache(CACHE_REGISTRY.selectedProjectId)
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
  const entry = CACHE_REGISTRY.aiPlannerDraft
  const cached = readCache<T>(entry)
  if (cached) return cached

  const raw = readRawStorage(entry.key)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as T
    writeCache(entry, parsed)
    return parsed
  } catch {
    return null
  }
}

export const writeAiPlannerDraftCache = <T>(payload: T) => {
  writeCache(CACHE_REGISTRY.aiPlannerDraft, payload)
}

export const clearAiPlannerDraftCache = () => {
  removeCache(CACHE_REGISTRY.aiPlannerDraft)
}

export const readTaskTodayAiOrderCache = <T>(): T | null => {
  const entry = CACHE_REGISTRY.taskTodayAiOrder
  const cached = readCache<T>(entry)
  if (cached) return cached

  const raw = readRawStorage(entry.key)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as T
    writeCache(entry, parsed)
    return parsed
  } catch {
    return null
  }
}

export const writeTaskTodayAiOrderCache = <T>(payload: T) => {
  writeCache(CACHE_REGISTRY.taskTodayAiOrder, payload)
}

export const clearTaskTodayAiOrderCache = () => {
  removeCache(CACHE_REGISTRY.taskTodayAiOrder)
}

export const readTaskListReplanStateCache = <T>(): T | null => {
  const entry = CACHE_REGISTRY.taskListReplanState
  const cached = readCache<T>(entry)
  if (cached) return cached

  const raw = readRawStorage(entry.key)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as T
    writeCache(entry, parsed)
    return parsed
  } catch {
    return null
  }
}

export const writeTaskListReplanStateCache = <T>(payload: T) => {
  writeCache(CACHE_REGISTRY.taskListReplanState, payload)
}

export const clearTaskListReplanStateCache = () => {
  removeCache(CACHE_REGISTRY.taskListReplanState)
}
