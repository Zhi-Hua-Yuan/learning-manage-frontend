import { listStorageKeys, readCache, removeCache, removeRawStorage, writeCache } from '@/utils/cacheClient'
import {
  getActorTaskListAllCacheEntry,
  getActorTaskListCacheEntry,
  TASK_LIST_CACHE_PREFIX,
} from '@/utils/cacheRegistry'
import { getActiveCacheActor } from '@/utils/cacheActor'
import type { TaskModel } from '@/types/task'
import { normalizeCachedTaskRecords } from '@/utils/taskCollection'

export const TASK_LIST_CACHE_TTL_MS = 5 * 60 * 1000

const normalizeTaskArray = (value: unknown): TaskModel[] | null => (
  Array.isArray(value) ? normalizeCachedTaskRecords(value) : null
)

const normalizeAllProjectsTaskCache = (value: unknown): Record<string, TaskModel[]> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null

  return Object.fromEntries(
    Object.entries(value).flatMap(([projectId, tasks]) => {
      if (!Array.isArray(tasks)) return []
      const normalizedTasks = normalizeCachedTaskRecords(tasks)
        .filter((task) => task.projectId === projectId)
      return [[projectId, normalizedTasks]]
    }),
  )
}

const upsertTaskList = (tasks: TaskModel[], task: TaskModel) =>
  tasks.some((item) => item.id === task.id)
    ? tasks.map((item) => (item.id === task.id ? { ...item, ...task } : item))
    : [...tasks, task]

export const readTaskCache = (projectId: string, maxAgeMs = TASK_LIST_CACHE_TTL_MS): TaskModel[] | null => {
  if (!projectId) return null
  const entry = getActorTaskListCacheEntry(projectId)
  if (!entry) return null
  const cached = readCache<TaskModel[]>(entry, {
    maxAgeMs,
    allowLegacyVersionless: true,
  })
  return normalizeTaskArray(cached)
}

export const writeTaskCache = (projectId: string, tasks: TaskModel[]) => {
  if (!projectId) return
  const entry = getActorTaskListCacheEntry(projectId)
  if (entry) writeCache(entry, normalizeCachedTaskRecords(tasks))
}

export const clearTaskCache = (projectId?: string) => {
  const actorId = getActiveCacheActor()
  if (!actorId) return
  if (projectId === undefined) {
    const actorSuffix = `:actor-${encodeURIComponent(actorId)}`
    listStorageKeys()
      .filter((key) => key.startsWith(`${TASK_LIST_CACHE_PREFIX}:`) && key.endsWith(actorSuffix))
      .forEach((key) => removeRawStorage(key))
    const aggregateEntry = getActorTaskListAllCacheEntry(actorId)
    if (aggregateEntry) removeCache(aggregateEntry)
    return
  }

  const entry = getActorTaskListCacheEntry(projectId, actorId)
  if (entry) removeCache(entry)
}

export const readAllProjectsTaskCache = (maxAgeMs = TASK_LIST_CACHE_TTL_MS): Record<string, TaskModel[]> | null => {
  const entry = getActorTaskListAllCacheEntry()
  if (!entry) return null
  const cached = readCache<Record<string, TaskModel[]>>(entry, {
    maxAgeMs,
    allowLegacyVersionless: true,
  })
  return normalizeAllProjectsTaskCache(cached)
}

export const writeAllProjectsTaskCache = (data: Record<string, TaskModel[]>) => {
  const entry = getActorTaskListAllCacheEntry()
  if (entry) writeCache(entry, normalizeAllProjectsTaskCache(data) || {})
}

export const upsertTaskInCaches = (task: TaskModel) => {
  const projectId = String(task.projectId || '')
  if (!projectId) return

  const nextProjectTasks = upsertTaskList(readTaskCache(projectId, Number.POSITIVE_INFINITY) || [], task)
  writeTaskCache(projectId, nextProjectTasks)

  const cachedAllProjectsTasks = readAllProjectsTaskCache(Number.POSITIVE_INFINITY) || {}
  const currentProjectTasks = Array.isArray(cachedAllProjectsTasks[projectId]) ? cachedAllProjectsTasks[projectId]! : []
  writeAllProjectsTaskCache({
    ...cachedAllProjectsTasks,
    [projectId]: upsertTaskList(currentProjectTasks, task),
  })
}

export const removeTaskFromCaches = (task: Pick<TaskModel, 'id' | 'projectId'>) => {
  const projectId = String(task.projectId || '')
  if (!projectId) return

  const nextProjectTasks = (readTaskCache(projectId, Number.POSITIVE_INFINITY) || []).filter((item) => item.id !== task.id)
  writeTaskCache(projectId, nextProjectTasks)

  const cachedAllProjectsTasks = readAllProjectsTaskCache(Number.POSITIVE_INFINITY) || {}
  const currentProjectTasks = Array.isArray(cachedAllProjectsTasks[projectId]) ? cachedAllProjectsTasks[projectId]! : []
  writeAllProjectsTaskCache({
    ...cachedAllProjectsTasks,
    [projectId]: currentProjectTasks.filter((item) => item.id !== task.id),
  })
}

export const writeAggregateTaskCacheFromRecords = (records: TaskModel[]) => {
  const nextCache: Record<string, TaskModel[]> = {}
  records.forEach((task) => {
    const projectId = String(task.projectId || '')
    if (!projectId) return
    if (!nextCache[projectId]) {
      nextCache[projectId] = []
    }
    nextCache[projectId]!.push(task)
  })
  writeAllProjectsTaskCache(nextCache)
}

export const syncAggregateTaskCacheByProject = (projectId: string, tasks: TaskModel[]) => {
  if (!projectId) return
  const cachedAllProjectsTasks = readAllProjectsTaskCache(Number.POSITIVE_INFINITY) || {}
  writeAllProjectsTaskCache({
    ...cachedAllProjectsTasks,
    [projectId]: tasks,
  })
}

export const removeProjectTaskCaches = (projectId: string) => {
  if (!projectId) return

  clearTaskCache(projectId)

  const cachedAllProjectsTasks = readAllProjectsTaskCache(Number.POSITIVE_INFINITY)
  if (!cachedAllProjectsTasks || !(projectId in cachedAllProjectsTasks)) return

  const nextCache = { ...cachedAllProjectsTasks }
  delete nextCache[projectId]
  writeAllProjectsTaskCache(nextCache)
}
