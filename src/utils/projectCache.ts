import { readCache, removeCache, writeCache } from '@/utils/cacheClient'
import { CACHE_REGISTRY, getProjectListCacheEntry } from '@/utils/cacheRegistry'

type CacheStatus = 0 | 1

interface ProjectProgressCacheItem {
  updatedAt: number
  value: number
}

export const PROJECT_LIST_CACHE_TTL_MS = 5 * 60 * 1000
export const PROJECT_PROGRESS_CACHE_TTL_MS = 30 * 60 * 1000

const readProjectProgressMap = () => {
  const cached = readCache<Record<string, ProjectProgressCacheItem>>(CACHE_REGISTRY.projectProgress, {
    allowLegacyVersionless: true,
  })
  if (!cached || typeof cached !== 'object') return null
  return cached
}

export const readProjectListCache = <T>(status: CacheStatus, maxAgeMs = PROJECT_LIST_CACHE_TTL_MS): T[] | null => {
  const cached = readCache<T[]>(getProjectListCacheEntry(status), {
    maxAgeMs,
    allowLegacyVersionless: true,
  })
  return Array.isArray(cached) ? cached : null
}

export const writeProjectListCache = <T>(status: CacheStatus, records: T[]) => {
  writeCache(getProjectListCacheEntry(status), records)
}

export const readProjectProgressCache = (projectId: string, maxAgeMs = PROJECT_PROGRESS_CACHE_TTL_MS): number | null => {
  const progressMap = readProjectProgressMap()
  if (!progressMap) return null

  const item = progressMap[projectId]
  if (!item || typeof item.updatedAt !== 'number' || typeof item.value !== 'number') return null
  if (Date.now() - item.updatedAt > maxAgeMs) return null
  return item.value
}

export const writeProjectProgressCache = (projectId: string, progress: number) => {
  const nextValue = normalizeProjectProgress(progress)
  const progressMap = readProjectProgressMap() || {}
  progressMap[projectId] = {
    updatedAt: Date.now(),
    value: nextValue,
  }
  writeCache(CACHE_REGISTRY.projectProgress, progressMap)
}

export const clearProjectProgressCache = (projectId?: string) => {
  if (!projectId) {
    removeCache(CACHE_REGISTRY.projectProgress)
    return
  }

  const progressMap = readProjectProgressMap()
  if (!progressMap || !(projectId in progressMap)) return
  delete progressMap[projectId]
  writeCache(CACHE_REGISTRY.projectProgress, progressMap)
}

export const normalizeProjectProgress = (value: unknown): number => {
  const num = Number(value)
  if (!Number.isFinite(num)) return 0

  const normalized = num > 0 && num <= 1 ? num * 100 : num
  if (normalized < 0) return 0
  if (normalized > 100) return 100
  return Math.round(normalized)
}

const getProjectProgressCandidates = (project: Record<string, unknown>) => [
  project.progress,
  project.completionRate,
  project.completeRate,
  project.completion,
  project.percent,
  project.process,
]

export const hasProjectProgressValue = (project: Record<string, unknown>) =>
  getProjectProgressCandidates(project).some(
    (candidate) => candidate !== null && candidate !== undefined && candidate !== '',
  )

export const resolveProjectProgress = (project: Record<string, unknown>) => {
  for (const candidate of getProjectProgressCandidates(project)) {
    if (candidate !== null && candidate !== undefined && candidate !== '') {
      return normalizeProjectProgress(candidate)
    }
  }

  return 0
}
