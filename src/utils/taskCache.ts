interface CacheEnvelope<T> {
  updatedAt: number
  data: T
}

interface Task {
  id: string
  title: string
  description?: string
  status: number
  priority: number
  projectId: string
  dueDate?: string | null
  milestoneId?: string | null
}

export const TASK_LIST_CACHE_TTL_MS = 5 * 60 * 1000

const TASK_LIST_CACHE_PREFIX = 'tick:cache:task-list:v1'
const TASK_LIST_ALL_CACHE_KEY = 'tick:cache:task-list:all:v1'

const readEnvelope = <T>(key: string): CacheEnvelope<T> | null => {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') return null
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
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') return
  const envelope: CacheEnvelope<T> = {
    updatedAt: Date.now(),
    data,
  }
  window.localStorage.setItem(key, JSON.stringify(envelope))
}

const getTaskCacheKey = (projectId: string) => `${TASK_LIST_CACHE_PREFIX}:${projectId}`

export const readTaskCache = (projectId: string, maxAgeMs = TASK_LIST_CACHE_TTL_MS): Task[] | null => {
  const envelope = readEnvelope<Task[]>(getTaskCacheKey(projectId))
  if (!envelope) return null
  if (Date.now() - envelope.updatedAt > maxAgeMs) return null
  return Array.isArray(envelope.data) ? envelope.data : null
}

export const writeTaskCache = (projectId: string, tasks: Task[]) => {
  writeEnvelope(getTaskCacheKey(projectId), tasks)
}

export const clearTaskCache = (projectId?: string) => {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') return
  if (projectId === undefined) {
    // Clear all task list caches
    const keysToRemove: string[] = []
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i)
      if (key && key.startsWith(TASK_LIST_CACHE_PREFIX)) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach((key) => window.localStorage.removeItem(key))
  } else {
    window.localStorage.removeItem(getTaskCacheKey(projectId))
  }
}

export const readAllProjectsTaskCache = (maxAgeMs = TASK_LIST_CACHE_TTL_MS): Record<string, Task[]> | null => {
  const envelope = readEnvelope<Record<string, Task[]>>(TASK_LIST_ALL_CACHE_KEY)
  if (!envelope) return null
  if (Date.now() - envelope.updatedAt > maxAgeMs) return null
  return envelope.data && typeof envelope.data === 'object' ? envelope.data : null
}

export const writeAllProjectsTaskCache = (data: Record<string, Task[]>) => {
  writeEnvelope(TASK_LIST_ALL_CACHE_KEY, data)
}
