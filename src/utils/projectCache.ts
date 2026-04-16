type CacheStatus = 0 | 1

interface CacheEnvelope<T> {
  updatedAt: number
  data: T
}

interface ProjectProgressCacheItem {
  updatedAt: number
  value: number
}

const PROJECT_LIST_CACHE_PREFIX = 'tick:cache:project-list'
const PROJECT_PROGRESS_CACHE_KEY = 'tick:cache:project-progress:v1'

export const PROJECT_LIST_CACHE_TTL_MS = 5 * 60 * 1000
export const PROJECT_PROGRESS_CACHE_TTL_MS = 30 * 60 * 1000

const canUseStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'

const readEnvelope = <T>(key: string): CacheEnvelope<T> | null => {
  if (!canUseStorage()) return null
  const raw = window.localStorage.getItem(key)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as CacheEnvelope<T>
    if (!parsed || typeof parsed !== 'object' || typeof parsed.updatedAt !== 'number' || !('data' in parsed)) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

const writeEnvelope = <T>(key: string, data: T) => {
  if (!canUseStorage()) return
  const envelope: CacheEnvelope<T> = {
    updatedAt: Date.now(),
    data,
  }
  window.localStorage.setItem(key, JSON.stringify(envelope))
}

const getProjectListKey = (status: CacheStatus) => `${PROJECT_LIST_CACHE_PREFIX}:status-${status}:v1`

export const readProjectListCache = <T>(status: CacheStatus, maxAgeMs = PROJECT_LIST_CACHE_TTL_MS): T[] | null => {
  const envelope = readEnvelope<T[]>(getProjectListKey(status))
  if (!envelope) return null
  if (Date.now() - envelope.updatedAt > maxAgeMs) return null
  return Array.isArray(envelope.data) ? envelope.data : null
}

export const writeProjectListCache = <T>(status: CacheStatus, records: T[]) => {
  writeEnvelope(getProjectListKey(status), records)
}

const readProjectProgressMap = () => {
  const envelope = readEnvelope<Record<string, ProjectProgressCacheItem>>(PROJECT_PROGRESS_CACHE_KEY)
  if (!envelope) return null
  if (!envelope.data || typeof envelope.data !== 'object') return null
  return envelope.data
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
  writeEnvelope(PROJECT_PROGRESS_CACHE_KEY, progressMap)
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
